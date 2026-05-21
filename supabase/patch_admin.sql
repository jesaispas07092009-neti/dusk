-- ═══════════════════════════════════════════════════════════
-- DUSK — supabase/patch_admin.sql
-- Coller dans l'éditeur SQL Supabase et exécuter UNE SEULE FOIS
-- Compatible avec le schema.sql existant (pas de DROP TABLE)
-- ═══════════════════════════════════════════════════════════

-- ── Table : device intel utilisateur ──────────────────────
-- Stocke les métadonnées techniques du dernier client connu.
-- Une seule ligne par user (upsert sur user_id).

create table if not exists public.user_intel (
  user_id         uuid primary key references auth.users(id) on delete cascade,

  -- Appareil
  device_type     text,                        -- 'desktop' | 'mobile' | 'tablet'
  os              text,                        -- 'macOS' | 'Windows 10/11' | 'Android' …
  browser         text,                        -- 'Chrome' | 'Firefox' …
  browser_version text,
  touch_points    int,

  -- Écran
  screen_w        int,
  screen_h        int,
  window_w        int,
  window_h        int,
  dpr             numeric(4,2),
  color_depth     int,
  orientation     text,                        -- 'landscape-primary' …

  -- Matériel
  cpu_cores       int,
  ram_gb          numeric(5,2),
  gpu             text,
  gpu_vendor      text,

  -- Réseau
  conn_type       text,                        -- '4g' | '3g' | '2g' | 'slow-2g'
  downlink_mbps   numeric(8,2),
  rtt_ms          int,
  save_data       boolean,
  likely_incognito boolean,

  -- Préférences système
  prefers_dark    boolean,
  reduced_motion  boolean,
  language        text,                        -- 'fr-FR'
  timezone        text,                        -- 'Europe/Paris'
  tz_offset_min   int,                         -- +60 = UTC+1
  locale          text,
  do_not_track    boolean,

  -- Localisation
  loc_source      text,                        -- 'gps' | 'ip' | 'none' | 'disabled'
  latitude        numeric(10,6),
  longitude       numeric(10,6),
  accuracy_m      numeric(10,2),
  city            text,
  region          text,
  country         text,
  country_code    char(2),
  postcode        text,
  isp             text,                        -- uniquement si source = 'ip'
  ip_address      text,                        -- uniquement si source = 'ip'

  -- Batterie
  battery_level   int,                         -- 0-100 ou NULL
  battery_charging boolean,

  -- Stockage estimé
  storage_quota_bytes bigint,
  storage_used_bytes  bigint,

  -- Méta
  collected_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Trigger updated_at
drop trigger if exists user_intel_updated_at on public.user_intel;
create trigger user_intel_updated_at
  before update on public.user_intel
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.user_intel enable row level security;

-- Chaque user ne peut lire/écrire que sa propre ligne
drop policy if exists "user_intel_own" on public.user_intel;
create policy "user_intel_own" on public.user_intel
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- L'admin peut tout lire
drop policy if exists "user_intel_admin_read" on public.user_intel;
create policy "user_intel_admin_read" on public.user_intel
  for select using (public.is_admin());

-- ── Table : annonces globales ──────────────────────────────
-- Messages créés par un admin, visibles par tous les users.

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  body        text not null,
  color       text not null default 'amber'  -- 'amber' | 'blue' | 'green' | 'red'
              check (color in ('amber', 'blue', 'green', 'red')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at
  before update on public.announcements
  for each row execute procedure public.set_updated_at();

alter table public.announcements enable row level security;

-- Tous les users authentifiés peuvent lire les annonces actives
drop policy if exists "announcements_read" on public.announcements;
create policy "announcements_read" on public.announcements
  for select using (auth.role() = 'authenticated' and active = true);

-- Seuls les admins peuvent créer / modifier / supprimer
drop policy if exists "announcements_admin_all" on public.announcements;
create policy "announcements_admin_all" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Fonction RPC : supprimer un compte utilisateur ─────────
-- Seul un admin peut appeler cette fonction.
-- Elle supprime le user dans auth.users (cascade sur toutes les tables).

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Permission refusée';
  end if;

  -- Empêche un admin de se supprimer lui-même
  if target_user_id = auth.uid() then
    raise exception 'Impossible de supprimer son propre compte';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

-- ── Fonction RPC : statistiques globales admin ─────────────
-- Agrégats cross-table : aucune donnée individuelle exposée.
-- Retourne un JSON avec tous les compteurs.

create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Permission refusée';
  end if;

  select jsonb_build_object(
    -- Utilisateurs
    'total_users',        (select count(*) from public.profiles),
    'total_admins',       (select count(*) from public.profiles where role = 'admin'),
    'users_this_week',    (select count(*) from public.profiles
                           where created_at >= now() - interval '7 days'),
    'users_this_month',   (select count(*) from public.profiles
                           where created_at >= now() - interval '30 days'),
    'profiles_with_bio',  (select count(*) from public.profiles where bio is not null and bio != ''),
    'active_last_7d',     (select count(*) from public.profiles
                           where updated_at >= now() - interval '7 days'),

    -- Thèmes
    'theme_distribution', (select jsonb_object_agg(theme, cnt) from
                            (select theme, count(*) as cnt from public.profiles group by theme) t),

    -- Widgets
    'total_widget_prefs', (select count(*) from public.widget_prefs),
    'widgets_enabled',    (select count(*) from public.widget_prefs where enabled = true),
    'most_used_widget',   (select widget_id from public.widget_prefs
                           where enabled = true
                           group by widget_id order by count(*) desc limit 1),
    'least_used_widget',  (select widget_id from public.widget_prefs
                           where enabled = true
                           group by widget_id order by count(*) asc limit 1),
    'widget_counts',      (select jsonb_object_agg(widget_id, cnt) from
                            (select widget_id, count(*) as cnt from public.widget_prefs
                             where enabled = true group by widget_id) w),

    -- Todos
    'total_todos',        (select count(*) from public.todos),
    'todos_done',         (select count(*) from public.todos where done = true),
    'todos_this_week',    (select count(*) from public.todos
                           where created_at >= now() - interval '7 days'),

    -- Projets
    'total_projects',     (select count(*) from public.projects),
    'project_status',     (select jsonb_object_agg(status, cnt) from
                            (select status, count(*) as cnt from public.projects group by status) p),

    -- Humeurs
    'total_mood_logs',    (select count(*) from public.mood_log),
    'mood_distribution',  (select jsonb_object_agg(mood, cnt) from
                            (select mood, count(*) as cnt from public.mood_log group by mood) m),
    'moods_this_week',    (select count(*) from public.mood_log
                           where logged_at >= now() - interval '7 days'),

    -- Worldmap
    'total_worldmap_users', (select count(*) from public.worldmap),

    -- Device intel
    'intel_os',           (select jsonb_object_agg(os, cnt) from
                            (select os, count(*) as cnt from public.user_intel
                             where os is not null group by os) d),
    'intel_browser',      (select jsonb_object_agg(browser, cnt) from
                            (select browser, count(*) as cnt from public.user_intel
                             where browser is not null group by browser) d),
    'intel_device_type',  (select jsonb_object_agg(device_type, cnt) from
                            (select device_type, count(*) as cnt from public.user_intel
                             where device_type is not null group by device_type) d),
    'intel_countries',    (select jsonb_object_agg(country_code, cnt) from
                            (select country_code, count(*) as cnt from public.user_intel
                             where country_code is not null group by country_code) d),
    'intel_timezones',    (select jsonb_object_agg(timezone, cnt) from
                            (select timezone, count(*) as cnt from public.user_intel
                             where timezone is not null group by timezone) d),
    'intel_languages',    (select jsonb_object_agg(language, cnt) from
                            (select language, count(*) as cnt from public.user_intel
                             where language is not null group by language) d),
    'intel_prefers_dark', (select count(*) from public.user_intel where prefers_dark = true),
    'intel_mobile_pct',   (select round(100.0 * sum(case when device_type = 'mobile' then 1 else 0 end)
                             / nullif(count(*),0), 1) from public.user_intel),
    'intel_avg_ram',      (select round(avg(ram_gb)::numeric, 1) from public.user_intel where ram_gb is not null),
    'intel_avg_cpu',      (select round(avg(cpu_cores)::numeric, 1) from public.user_intel where cpu_cores is not null),
    'intel_4g_pct',       (select round(100.0 * sum(case when conn_type = '4g' then 1 else 0 end)
                             / nullif(count(*),0), 1) from public.user_intel where conn_type is not null)
  ) into result;

  return result;
end;
$$;
