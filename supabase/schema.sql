-- ═══════════════════════════════════════════════════════════
-- DUSK — Supabase schema
-- Coller dans l'éditeur SQL de Supabase et exécuter
-- ═══════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('admin', 'user')),
  initials   text not null default 'DK',
  name       text not null default 'Dusk',
  job_role   text default 'Explorateur nocturne',
  bio        text default '',
  tags       text[] not null default '{}',
  stats      jsonb not null default '[]'::jsonb,
  theme      text not null default 'dusk',   -- ← thème atmosphérique actif
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration : ajouter la colonne theme si la table profiles existe déjà
-- (à exécuter une seule fois sur une base existante)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'theme'
  ) then
    alter table public.profiles add column theme text not null default 'dusk';
  end if;
end $$;

create table if not exists public.widget_prefs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  widget_id  text not null,
  enabled    boolean not null default true,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, widget_id)
);

create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  emoji      text not null default '🔗',
  url        text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text default '',
  status      text not null default 'concept' check (status in ('actif','en pause','concept','terminé','idée')),
  color       text default '#c8813c',
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.mood_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mood       text not null,
  note       text default '',
  logged_at  timestamptz not null default now()
);

create table if not exists public.worldmap (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  visited    text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── Fonction admin ───────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ── Row Level Security ───────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.widget_prefs   enable row level security;
alter table public.todos          enable row level security;
alter table public.links          enable row level security;
alter table public.projects       enable row level security;
alter table public.mood_log  enable row level security;
alter table public.worldmap  enable row level security;

-- Profiles : lecture propre (user = le sien, admin = tous)
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select"       on public.profiles;
drop policy if exists "profiles_insert"       on public.profiles;
drop policy if exists "profiles_update"       on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (
    auth.uid() = id
    or public.is_admin()
  )
  with check (
    auth.uid() = id
    or public.is_admin()
  );

-- Autres tables : accès exclusif à l'owner
drop policy if exists "widget_prefs_all" on public.widget_prefs;
create policy "widget_prefs_all" on public.widget_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_all" on public.todos;
create policy "todos_all" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "links_all" on public.links;
create policy "links_all" on public.links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_all" on public.projects;
create policy "projects_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mood_log_all" on public.mood_log;
create policy "mood_log_all" on public.mood_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "worldmap_all" on public.worldmap;
create policy "worldmap_all" on public.worldmap
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Trigger : création automatique du profil à l'inscription ──

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, initials, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Dusk'),
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Dusk'), 2)),
    'dusk'
  )
  on conflict (id) do nothing;

  insert into public.widget_prefs (user_id, widget_id, enabled, position)
  select new.id, w.widget_id, true, w.pos
  from (values
    ('clock',0),('weather',1),('quote',2),('todo',3),('moon',4),
    ('word',5),('snake',6),('compliment',7),('timer',8),('memory',9),
    ('profile',10),('sunrise',11),('calendar',12),('quiz',13),
    ('tictactoe',14),('game2048',15),('reflex',16),('world-clock',17),
    ('links',18),('stats',19),('projects',20),('mood',21),
    ('radio',22),('secret',23),('mystery',24),('worldmap',25)
  ) as w(widget_id, pos)
  on conflict (user_id, widget_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Trigger : updated_at automatique ────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists todos_updated_at on public.todos;
create trigger todos_updated_at before update on public.todos
  for each row execute procedure public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists worldmap_updated_at on public.worldmap;
create trigger worldmap_updated_at before update on public.worldmap
  for each row execute procedure public.set_updated_at();

-- ── Promouvoir le premier admin manuellement ─────────────────
-- Remplace l'email par le tien, exécuter UNE SEULE FOIS :
--
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'ton@email.com');
