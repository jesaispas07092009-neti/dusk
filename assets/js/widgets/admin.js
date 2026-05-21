/* ── Widget : Admin ──────────────────────────────────────── */
import { state }               from '../state.js';
import { supabase }            from '../supabase.js';
import { esc }                 from '../utils/escape.js';
import { collectDeviceIntel }  from '../lib/device-intel.js';
import { hasConsented }        from '../consent.js';

function isAdmin() {
  return state.get('user.profile')?.role === 'admin';
}

/* ════════════════════════════════════════════════════════════
   SAUVEGARDE INTEL (conditionnée au consentement)
   ════════════════════════════════════════════════════════════ */

export async function pushDeviceIntel() {
  if (!supabase) return;
  if (!hasConsented()) return;

  const userId = state.get('user.id');
  if (!userId) return;

  try {
    const intel = await collectDeviceIntel({ withLocation: true });
    const loc   = intel.location || {};
    const net   = intel.network  || {};
    const dev   = intel.device   || {};
    const scr   = intel.screen   || {};
    const hw    = intel.hardware || {};
    const pref  = intel.prefs    || {};
    const batt  = intel.battery  || {};
    const stor  = intel.storage  || {};

    const row = {
      user_id:              userId,
      device_type:          dev.type             || null,
      os:                   dev.os               || null,
      browser:              dev.browser          || null,
      browser_version:      dev.browserVersion   || null,
      touch_points:         dev.touchPoints      ?? null,
      screen_w:             scr.screenW          || null,
      screen_h:             scr.screenH          || null,
      window_w:             scr.windowW          || null,
      window_h:             scr.windowH          || null,
      dpr:                  scr.dpr              || null,
      color_depth:          scr.colorDepth       || null,
      orientation:          scr.orientation      || null,
      cpu_cores:            hw.cpuCores          || null,
      ram_gb:               hw.ramGB             || null,
      gpu:                  hw.gpu               || null,
      gpu_vendor:           hw.gpuVendor         || null,
      conn_type:            net.connType         || null,
      downlink_mbps:        net.downlinkMbps     || null,
      rtt_ms:               net.rttMs            || null,
      save_data:            net.saveData         || false,
      likely_incognito:     stor.likelyIncognito ?? null,
      prefers_dark:         pref.prefersColorScheme === 'dark',
      reduced_motion:       pref.prefersReducedMotion ?? null,
      language:             pref.language        || null,
      timezone:             pref.timezone        || null,
      tz_offset_min:        pref.tzOffset        ?? null,
      locale:               pref.locale          || null,
      do_not_track:         pref.doNotTrack      ?? null,
      loc_source:           loc.source           || 'none',
      latitude:             loc.latitude         || null,
      longitude:            loc.longitude        || null,
      accuracy_m:           loc.accuracyM        || null,
      city:                 loc.city             || null,
      region:               loc.region           || null,
      country:              loc.country          || null,
      country_code:         loc.countryCode      || null,
      postcode:             loc.postcode         || null,
      isp:                  loc.isp              || null,
      ip_address:           loc.ip               || null,
      battery_level:        batt.batteryLevel    ?? null,
      battery_charging:     batt.batteryCharging ?? null,
      storage_quota_bytes:  stor.storageQuotaBytes ?? null,
      storage_used_bytes:   stor.storageUsedBytes  ?? null,
      collected_at:         intel.collectedAt,
    };

    await supabase
      .from('user_intel')
      .upsert(row, { onConflict: 'user_id' });
  } catch (err) {
    console.warn('[admin] pushDeviceIntel failed:', err?.message || err);
  }
}

/* ════════════════════════════════════════════════════════════
   PALETTE ADMIN — couleurs cohérentes avec les thèmes Dusk
   ════════════════════════════════════════════════════════════ */

const PALETTE = [
  'var(--color-accent)',
  '#4a7ab5',
  '#8b5cf6',
  '#4a8f7a',
  '#c84a4a',
  '#7a7067',
  '#d97706',
  '#0891b2',
];

/* ════════════════════════════════════════════════════════════
   HELPERS DE RENDU
   ════════════════════════════════════════════════════════════ */

function renderLoading(container, msg = 'Chargement…') {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-12)">
      <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4)">
        <div class="admin-spinner"></div>
        <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">${esc(msg)}</span>
      </div>
    </div>`;
}

function renderError(container, msg) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-8)">
      <div style="
        padding:var(--space-4) var(--space-6);
        background:rgba(200,74,74,0.08);
        border:1px solid rgba(200,74,74,0.2);
        border-radius:var(--radius-md);
        font-family:var(--font-mono);font-size:var(--text-xs);color:#c84a4a;
        text-align:center;
      ">⚠ ${esc(msg)}</div>
    </div>`;
}

/* ── Carte KPI ───────────────────────────────────────────── */
function kpiCard(label, value, sub = '', accent = false) {
  return `
    <div style="
      background:${accent ? 'var(--color-accent-dim)' : 'var(--color-surface-2)'};
      border:1px solid ${accent ? 'var(--color-border-warm)' : 'var(--color-border)'};
      border-radius:var(--radius-md);
      padding:var(--space-4) var(--space-5);
      display:flex;flex-direction:column;gap:var(--space-2);
    ">
      <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase">
        ${esc(label)}
      </div>
      <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:${accent ? 'var(--color-accent)' : 'var(--color-text)'};line-height:1">
        ${esc(String(value ?? '—'))}
      </div>
      ${sub ? `<div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint)">${esc(sub)}</div>` : ''}
    </div>`;
}

/* ── Barre de progression animée ─────────────────────────── */
function progressBar(label, count, total, color = 'var(--color-accent)', showPct = true) {
  const pct  = total > 0 ? Math.round((count / total) * 100) : 0;
  const disp = showPct ? `${count} <span style="color:var(--color-text-faint)">(${pct}%)</span>` : String(count);
  return `
    <div style="display:flex;flex-direction:column;gap:5px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-muted)">${esc(label)}</span>
        <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-muted)">${disp}</span>
      </div>
      <div style="height:5px;background:var(--color-surface-3);border-radius:999px;overflow:hidden">
        <div style="
          width:0%;height:100%;background:${color};border-radius:999px;
          transition:width .7s var(--ease-emerge);
        " data-target-width="${pct}%"></div>
      </div>
    </div>`;
}

/* ── Section titre ───────────────────────────────────────── */
function sectionTitle(text, icon = '') {
  return `
    <div style="
      display:flex;align-items:center;gap:var(--space-3);
      margin:var(--space-7) 0 var(--space-4);
    ">
      ${icon ? `<span style="font-size:0.9rem">${icon}</span>` : ''}
      <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.12em;text-transform:uppercase">${esc(text)}</span>
      <div style="flex:1;height:1px;background:var(--color-border)"></div>
    </div>`;
}

/* ── Rendre les barres de distribution depuis un objet ──── */
function distBars(obj) {
  if (!obj || typeof obj !== 'object') {
    return `<span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint)">Aucune donnée</span>`;
  }
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((acc, [, v]) => acc + Number(v), 0);
  return entries.map(([k, v], i) =>
    progressBar(k || '?', Number(v), total, PALETTE[i % PALETTE.length])
  ).join('');
}

/* ── Animer les barres de progression après insertion ────── */
function animateBars(root) {
  requestAnimationFrame(() => {
    root.querySelectorAll('[data-target-width]').forEach(el => {
      const target = el.dataset.targetWidth;
      requestAnimationFrame(() => { el.style.width = target; });
    });
  });
}

/* ── Badge rôle ──────────────────────────────────────────── */
function roleBadge(role) {
  const isAdm = role === 'admin';
  return `
    <span style="
      font-family:var(--font-mono);font-size:0.58rem;
      padding:2px 9px;border-radius:999px;
      background:${isAdm ? 'rgba(200,129,60,0.14)' : 'var(--color-surface-3)'};
      color:${isAdm ? 'var(--color-accent)' : 'var(--color-text-faint)'};
      border:1px solid ${isAdm ? 'rgba(200,129,60,0.28)' : 'var(--color-border)'};
      white-space:nowrap;
    ">${esc(role)}</span>`;
}

/* ── Pill tag générique ───────────────────────────────────── */
function pill(text) {
  if (!text) return '';
  return `
    <span style="
      font-family:var(--font-mono);font-size:0.58rem;
      padding:1px 8px;border-radius:999px;
      background:var(--color-surface-3);
      color:var(--color-text-faint);
      border:1px solid var(--color-border);
    ">${esc(text)}</span>`;
}

/* ════════════════════════════════════════════════════════════
   ONGLET : STATISTIQUES GLOBALES
   ════════════════════════════════════════════════════════════ */

async function renderStatsTab(container) {
  renderLoading(container, 'Agrégation des statistiques…');

  let stats;
  try {
    const { data, error } = await supabase.rpc('admin_get_stats');
    if (error) throw error;
    stats = data;
  } catch (e) {
    renderError(container, 'Impossible de charger les stats : ' + (e?.message || 'erreur inconnue'));
    return;
  }

  const s = stats || {};

  const totalUsers  = Number(s.total_users  || 0);
  const totalTodos  = Number(s.total_todos  || 0);
  const todosDone   = Number(s.todos_done   || 0);
  const todoPct     = totalTodos > 0 ? Math.round((todosDone / totalTodos) * 100) : 0;

  container.innerHTML = `<div style="max-width:720px;margin:0 auto;padding-bottom:var(--space-10)">

    ${sectionTitle('Utilisateurs', '👤')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
      ${kpiCard('Total', totalUsers, '', true)}
      ${kpiCard('Cette semaine', s.users_this_week ?? '—', '7 derniers jours')}
      ${kpiCard('Ce mois', s.users_this_month ?? '—', '30 derniers jours')}
      ${kpiCard('Actifs 7j', s.active_last_7d ?? '—', 'mis à jour récemment')}
      ${kpiCard('Admins', s.total_admins ?? '—')}
      ${kpiCard('Avec bio', s.profiles_with_bio ?? '—')}
    </div>

    ${sectionTitle('Thèmes choisis', '🎨')}
    <div style="
      background:var(--color-surface-2);border:1px solid var(--color-border);
      border-radius:var(--radius-md);padding:var(--space-5);
      display:flex;flex-direction:column;gap:var(--space-3);
    ">
      ${distBars(s.theme_distribution)}
    </div>

    ${sectionTitle('Widgets', '🧩')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
      ${kpiCard('Prefs totales', s.total_widget_prefs ?? '—')}
      ${kpiCard('Activés', s.widgets_enabled ?? '—')}
      ${kpiCard('+ populaire', s.most_used_widget ?? '—', 'widget le + utilisé', true)}
    </div>
    <div style="
      background:var(--color-surface-2);border:1px solid var(--color-border);
      border-radius:var(--radius-md);padding:var(--space-5);
      display:flex;flex-direction:column;gap:var(--space-3);
    ">
      ${distBars(s.widget_counts)}
    </div>

    ${sectionTitle('Todos & Projets', '✅')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
      ${kpiCard('Todos total', totalTodos)}
      ${kpiCard('Complétées', todosDone, `${todoPct}% du total`)}
      ${kpiCard('Créées 7j', s.todos_this_week ?? '—')}
      ${kpiCard('Projets', s.total_projects ?? '—')}
    </div>
    <div style="
      background:var(--color-surface-2);border:1px solid var(--color-border);
      border-radius:var(--radius-md);padding:var(--space-5);
      display:flex;flex-direction:column;gap:var(--space-3);
    ">
      ${distBars(s.project_status)}
    </div>

    ${sectionTitle('Humeurs', '🌙')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
      ${kpiCard('Logs total', s.total_mood_logs ?? '—')}
      ${kpiCard('Cette semaine', s.moods_this_week ?? '—')}
    </div>
    <div style="
      background:var(--color-surface-2);border:1px solid var(--color-border);
      border-radius:var(--radius-md);padding:var(--space-5);
      display:flex;flex-direction:column;gap:var(--space-3);
    ">
      ${distBars(s.mood_distribution)}
    </div>

    ${sectionTitle('Appareils & Réseau', '📡')}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);margin-bottom:var(--space-4)">
      ${kpiCard('Mobile %', s.intel_mobile_pct != null ? s.intel_mobile_pct + ' %' : '—')}
      ${kpiCard('RAM moy.', s.intel_avg_ram != null ? s.intel_avg_ram + ' Go' : '—')}
      ${kpiCard('CPU moy.', s.intel_avg_cpu != null ? s.intel_avg_cpu + ' cœurs' : '—')}
      ${kpiCard('4G %', s.intel_4g_pct != null ? s.intel_4g_pct + ' %' : '—')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">OS</div>
        ${distBars(s.intel_os)}
      </div>

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">Navigateur</div>
        ${distBars(s.intel_browser)}
      </div>

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">Appareil</div>
        ${distBars(s.intel_device_type)}
      </div>

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">Pays</div>
        ${distBars(s.intel_countries)}
      </div>

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">Langues</div>
        ${distBars(s.intel_languages)}
      </div>

      <div style="
        background:var(--color-surface-2);border:1px solid var(--color-border);
        border-radius:var(--radius-md);padding:var(--space-5);
        display:flex;flex-direction:column;gap:var(--space-3);
      ">
        <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:.1em;text-transform:uppercase;margin-bottom:var(--space-1)">Fuseaux horaires</div>
        ${distBars(s.intel_timezones)}
      </div>

    </div>

    <div style="
      margin-top:var(--space-5);
      display:flex;align-items:center;gap:var(--space-3);
      padding:var(--space-3) var(--space-4);
      background:var(--color-surface-2);border:1px solid var(--color-border);
      border-radius:var(--radius-md);
    ">
      <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint)">
        🌙 Mode sombre : <strong style="color:var(--color-text-muted)">${s.intel_prefers_dark ?? '—'} utilisateurs</strong>
        &nbsp;·&nbsp; Worldmap : <strong style="color:var(--color-text-muted)">${s.total_worldmap_users ?? '—'} utilisateurs</strong>
      </span>
    </div>

  </div>`;

  animateBars(container);
}

/* ════════════════════════════════════════════════════════════
   ONGLET : UTILISATEURS
   ════════════════════════════════════════════════════════════ */

async function renderUsersTab(container) {
  renderLoading(container, 'Chargement des utilisateurs…');

  let users, intels;
  try {
    const [usersRes, intelsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, initials, role, theme, bio, tags, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('user_intel')
        .select('user_id, device_type, os, browser, city, country_code, loc_source, timezone, prefers_dark, collected_at'),
    ]);
    if (usersRes.error) throw usersRes.error;
    users  = usersRes.data  || [];
    intels = intelsRes.data || [];
  } catch (e) {
    renderError(container, 'Erreur de chargement : ' + (e?.message || 'inconnue'));
    return;
  }

  const intelMap   = Object.fromEntries(intels.map(i => [i.user_id, i]));
  const currentId  = state.get('user.id');
  const adminCount = users.filter(u => u.role === 'admin').length;

  const DEVICE_ICON = { mobile: '📱', tablet: '📟', desktop: '🖥' };

  function renderList(filterStr = '') {
    const q        = filterStr.toLowerCase().trim();
    const filtered = q
      ? users.filter(u =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q) ||
          (intelMap[u.id]?.city || '').toLowerCase().includes(q) ||
          (intelMap[u.id]?.country_code || '').toLowerCase().includes(q)
        )
      : users;

    const listEl = container.querySelector('#admin-user-list');
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div style="
          font-family:var(--font-mono);font-size:var(--text-xs);
          color:var(--color-text-faint);padding:var(--space-6);text-align:center;
        ">Aucun résultat pour « ${esc(filterStr)} »</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(u => {
      const isSelf   = u.id === currentId;
      const isAdminU = u.role === 'admin';
      const intel    = intelMap[u.id];
      const initials = esc(u.initials || (u.name || '?').slice(0, 2).toUpperCase());
      const dateIn   = new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      const lastSeen = u.updated_at
        ? new Date(u.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '—';

      const deviceIcon = intel?.device_type ? (DEVICE_ICON[intel.device_type] || '') : '';
      const loc        = intel?.city ? `${intel.city}${intel.country_code ? ', ' + intel.country_code : ''}` : '';

      return `
        <div style="
          background:var(--color-surface-2);
          border:1px solid var(--color-border);
          border-radius:var(--radius-md);
          padding:var(--space-4) var(--space-5);
          display:flex;flex-direction:column;gap:var(--space-3);
          transition:border-color var(--duration-fast);
        " onmouseenter="this.style.borderColor='var(--color-border-warm)'"
           onmouseleave="this.style.borderColor='var(--color-border)'">

          <div style="display:flex;align-items:center;gap:var(--space-4)">

            <div style="
              flex-shrink:0;width:38px;height:38px;border-radius:50%;
              background:${isAdminU ? 'var(--color-accent-dim)' : 'var(--color-surface-3)'};
              border:1px solid ${isAdminU ? 'var(--color-border-warm)' : 'var(--color-border)'};
              display:flex;align-items:center;justify-content:center;
              font-family:var(--font-mono);font-size:0.65rem;
              color:${isAdminU ? 'var(--color-accent)' : 'var(--color-text-muted)'};
            ">${initials}</div>

            <div style="flex:1;min-width:0">
              <div style="
                font-family:var(--font-body);font-size:var(--text-sm);
                color:var(--color-text);display:flex;align-items:center;gap:var(--space-2)
              ">
                ${esc(u.name || 'Utilisateur')}
                ${isSelf ? `<span style="font-family:var(--font-mono);font-size:0.58rem;color:var(--color-text-faint)">(vous)</span>` : ''}
              </div>
              <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);margin-top:2px">
                Inscrit le ${esc(dateIn)} · Vu le ${esc(lastSeen)}
                ${loc ? ` · 📍 ${esc(loc)}` : ''}
              </div>
            </div>

            ${roleBadge(u.role)}

          </div>

          ${intel ? `
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);padding-top:var(--space-2);border-top:1px solid var(--color-border)">
            ${deviceIcon ? `<span title="${esc(intel.device_type || '')}">${deviceIcon}</span>` : ''}
            ${pill(intel.os?.split(' ')[0] || null)}
            ${pill(intel.browser || null)}
            ${intel.timezone ? pill('🕐 ' + intel.timezone) : ''}
            ${intel.prefers_dark ? pill('🌙 dark') : ''}
            ${intel.loc_source === 'ip'  ? pill('📍 ip')  : ''}
            ${intel.loc_source === 'gps' ? pill('📍 gps') : ''}
          </div>` : ''}

          ${!isSelf ? `
          <div style="display:flex;gap:var(--space-2);padding-top:var(--space-1)">
            <button data-toggle-role="${esc(u.id)}" data-current-role="${esc(u.role)}"
              style="
                font-family:var(--font-mono);font-size:0.6rem;
                padding:3px 12px;border-radius:999px;
                border:1px solid var(--color-border);
                background:transparent;color:var(--color-text-muted);cursor:pointer;
              ">
              ${isAdminU ? '↓ passer user' : '↑ passer admin'}
            </button>
            <button data-delete-user="${esc(u.id)}" data-user-name="${esc(u.name || 'cet utilisateur')}"
              style="
                font-family:var(--font-mono);font-size:0.6rem;
                padding:3px 12px;border-radius:999px;
                border:1px solid rgba(200,74,74,0.3);
                background:transparent;color:#c84a4a;cursor:pointer;
              ">
              Supprimer
            </button>
          </div>` : ''}

        </div>`;
    }).join('');

    // Événements rôle
    listEl.querySelectorAll('[data-toggle-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId  = btn.dataset.toggleRole;
        const newRole = btn.dataset.currentRole === 'admin' ? 'user' : 'admin';
        btn.textContent = '…'; btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
          if (error) throw error;
          const u = users.find(x => x.id === userId);
          if (u) u.role = newRole;
          renderList(container.querySelector('#admin-search')?.value || '');
        } catch {
          btn.textContent = 'Erreur'; btn.disabled = false;
        }
      });
    });

    // Événements suppression
    listEl.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId   = btn.dataset.deleteUser;
        const userName = btn.dataset.userName;
        if (!confirm(`Supprimer définitivement « ${userName} » ? Cette action est irréversible.`)) return;
        btn.textContent = '…'; btn.disabled = true;
        try {
          const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
          if (error) throw error;
          const idx = users.findIndex(x => x.id === userId);
          if (idx !== -1) users.splice(idx, 1);
          renderList(container.querySelector('#admin-search')?.value || '');
          const countEl = container.querySelector('#admin-user-count');
          if (countEl) countEl.textContent = `${users.length} utilisateur${users.length > 1 ? 's' : ''} · ${users.filter(u => u.role === 'admin').length} admin`;
        } catch (e) {
          alert('Erreur : ' + (e?.message || 'inconnue'));
          btn.textContent = 'Supprimer'; btn.disabled = false;
        }
      });
    });
  }

  container.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding-bottom:var(--space-10)">

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-6)">
        ${kpiCard('Utilisateurs', users.length, '', true)}
        ${kpiCard('Admins', adminCount)}
        ${kpiCard('Intel collecté', intels.length, 'avec consentement')}
      </div>

      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <input id="admin-search" type="search" placeholder="Filtrer par nom, pays, rôle…"
          style="
            flex:1;background:var(--color-surface-2);
            border:1px solid var(--color-border);border-radius:var(--radius-md);
            padding:var(--space-3) var(--space-4);
            font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none;
          " />
        <span id="admin-user-count"
          style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);white-space:nowrap">
          ${users.length} utilisateur${users.length > 1 ? 's' : ''} · ${adminCount} admin
        </span>
      </div>

      <div style="display:flex;flex-direction:column;gap:var(--space-3)" id="admin-user-list"></div>

    </div>`;

  renderList();
  container.querySelector('#admin-search').addEventListener('input', e => renderList(e.target.value));
}

/* ════════════════════════════════════════════════════════════
   ONGLET : ANNONCES
   ════════════════════════════════════════════════════════════ */

async function renderAnnouncementsTab(container) {
  async function refresh() {
    renderLoading(container, 'Chargement des annonces…');
    let rows;
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, body, color, active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data || [];
    } catch (e) {
      renderError(container, 'Erreur : ' + (e?.message || 'inconnue'));
      return;
    }

    const COLOR_STYLES = {
      amber: { bg: 'rgba(200,129,60,0.10)', border: 'rgba(200,129,60,0.28)', text: 'var(--color-accent)' },
      blue:  { bg: 'rgba(74,122,181,0.10)', border: 'rgba(74,122,181,0.28)', text: '#4a7ab5' },
      green: { bg: 'rgba(74,143,122,0.10)', border: 'rgba(74,143,122,0.28)', text: '#4a8f7a' },
      red:   { bg: 'rgba(200,74,74,0.10)',  border: 'rgba(200,74,74,0.28)',  text: '#c84a4a' },
    };

    container.innerHTML = `
      <div style="max-width:680px;margin:0 auto;padding-bottom:var(--space-10)">

        ${sectionTitle('Nouvelle annonce', '📢')}
        <div style="
          background:var(--color-surface-2);border:1px solid var(--color-border);
          border-radius:var(--radius-md);padding:var(--space-5);
          display:flex;flex-direction:column;gap:var(--space-4);
        ">
          <input id="ann-title" type="text" placeholder="Titre (optionnel)"
            style="
              background:var(--color-surface-3);border:1px solid var(--color-border);
              border-radius:var(--radius-sm);padding:var(--space-3) var(--space-4);
              font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none;
            " />
          <textarea id="ann-body" rows="3" placeholder="Message affiché à tous les utilisateurs…"
            style="
              background:var(--color-surface-3);border:1px solid var(--color-border);
              border-radius:var(--radius-sm);padding:var(--space-3) var(--space-4);
              font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);
              outline:none;resize:vertical;
            "></textarea>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <select id="ann-color"
              style="
                background:var(--color-surface-3);border:1px solid var(--color-border);
                border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);
                font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none;
              ">
              <option value="amber">🟠 Ambre</option>
              <option value="blue">🔵 Bleu</option>
              <option value="green">🟢 Vert</option>
              <option value="red">🔴 Rouge</option>
            </select>
            <button id="ann-submit"
              style="
                margin-left:auto;font-family:var(--font-mono);font-size:var(--text-xs);
                padding:var(--space-2) var(--space-5);border-radius:999px;
                border:1px solid var(--color-accent);
                background:var(--color-accent-dim);color:var(--color-accent);cursor:pointer;
              ">
              Publier
            </button>
          </div>
          <div id="ann-status" style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);min-height:1em"></div>
        </div>

        ${sectionTitle('Annonces existantes', '📋')}
        <div id="ann-list" style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${rows.length === 0
            ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-6)">Aucune annonce pour l'instant.</div>`
            : rows.map(r => {
                const cs = COLOR_STYLES[r.color] || COLOR_STYLES.amber;
                return `
                  <div style="
                    padding:var(--space-4) var(--space-5);border-radius:var(--radius-md);
                    background:${cs.bg};border:1px solid ${cs.border};
                    opacity:${r.active ? 1 : 0.45};
                    transition:opacity var(--duration-base);
                  ">
                    <div style="display:flex;align-items:flex-start;gap:var(--space-4)">
                      <div style="flex:1;min-width:0">
                        ${r.title ? `<div style="font-family:var(--font-display);font-size:var(--text-sm);color:${cs.text};margin-bottom:var(--space-2)">${esc(r.title)}</div>` : ''}
                        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.7">${esc(r.body)}</div>
                        <div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--color-text-faint);margin-top:var(--space-3)">
                          ${new Date(r.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                          · <span style="color:${r.active ? cs.text : 'var(--color-text-faint)'}">
                            ${r.active ? 'Active' : 'Désactivée'}
                          </span>
                        </div>
                      </div>
                      <div style="display:flex;flex-direction:column;gap:var(--space-2);flex-shrink:0">
                        <button data-toggle-ann="${esc(r.id)}" data-active="${r.active}"
                          style="
                            font-family:var(--font-mono);font-size:0.58rem;
                            padding:3px 10px;border-radius:999px;
                            border:1px solid ${cs.border};background:transparent;color:${cs.text};cursor:pointer;
                          ">${r.active ? 'Désactiver' : 'Activer'}</button>
                        <button data-delete-ann="${esc(r.id)}"
                          style="
                            font-family:var(--font-mono);font-size:0.58rem;
                            padding:3px 10px;border-radius:999px;
                            border:1px solid rgba(200,74,74,0.3);background:transparent;color:#c84a4a;cursor:pointer;
                          ">Supprimer</button>
                      </div>
                    </div>
                  </div>`;
              }).join('')
          }
        </div>
      </div>`;

    // Publier
    container.querySelector('#ann-submit').addEventListener('click', async () => {
      const title  = container.querySelector('#ann-title').value.trim();
      const body   = container.querySelector('#ann-body').value.trim();
      const color  = container.querySelector('#ann-color').value;
      const status = container.querySelector('#ann-status');
      if (!body) { status.textContent = 'Le message ne peut pas être vide.'; return; }
      const btn = container.querySelector('#ann-submit');
      btn.disabled = true; btn.textContent = '…';
      try {
        const { error } = await supabase.from('announcements').insert({
          author_id: state.get('user.id'),
          title, body, color, active: true,
        });
        if (error) throw error;
        await refresh();
      } catch (e) {
        status.textContent = 'Erreur : ' + (e?.message || 'inconnue');
        btn.disabled = false; btn.textContent = 'Publier';
      }
    });

    container.querySelectorAll('[data-toggle-ann]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id     = btn.dataset.toggleAnn;
        const active = btn.dataset.active !== 'true';
        btn.disabled = true;
        const { error } = await supabase.from('announcements').update({ active }).eq('id', id);
        if (!error) await refresh();
        else btn.disabled = false;
      });
    });

    container.querySelectorAll('[data-delete-ann]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette annonce définitivement ?')) return;
        btn.disabled = true;
        const { error } = await supabase.from('announcements').delete().eq('id', btn.dataset.deleteAnn);
        if (!error) await refresh();
        else btn.disabled = false;
      });
    });
  }

  await refresh();
}

/* ════════════════════════════════════════════════════════════
   WIDGET EXPORT
   ════════════════════════════════════════════════════════════ */

export const adminWidget = {
  id:        'admin',
  label:     'Admin',
  size:      'small',
  adminOnly: true,

  render(container) {
    if (!isAdmin()) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-3)">
        <div style="
          width:44px;height:44px;border-radius:50%;
          background:var(--color-accent-dim);border:1px solid var(--color-border-warm);
          display:flex;align-items:center;justify-content:center;font-size:1.2rem;
        ">🛡</div>
        <div style="font-family:var(--font-display);font-size:var(--text-base);color:var(--color-text)">Panneau admin</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Stats · Utilisateurs · Annonces</div>
      </div>`;
  },

  renderDetail(container) {
    if (!isAdmin()) {
      container.innerHTML = `
        <div class="wc-center" style="padding:var(--space-8)">
          <div style="color:var(--color-text-muted);font-family:var(--font-mono);font-size:var(--text-sm)">Accès refusé.</div>
        </div>`;
      return;
    }

    const TABS = [
      { id: 'stats',         label: '📊 Statistiques' },
      { id: 'users',         label: '👥 Utilisateurs'  },
      { id: 'announcements', label: '📢 Annonces'      },
    ];
    let activeTab = 'stats';

    function renderShell() {
      container.innerHTML = `
        <div style="max-width:760px;margin:0 auto">
          <nav style="
            display:flex;gap:var(--space-2);
            margin-bottom:var(--space-6);
            border-bottom:1px solid var(--color-border);
            padding-bottom:var(--space-4);
          ">
            ${TABS.map(t => `
              <button data-subtab="${esc(t.id)}" style="
                font-family:var(--font-mono);font-size:0.65rem;
                padding:var(--space-2) var(--space-4);
                border-radius:999px;
                border:1px solid ${activeTab === t.id ? 'var(--color-accent)' : 'var(--color-border)'};
                background:${activeTab === t.id ? 'var(--color-accent-dim)' : 'transparent'};
                color:${activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)'};
                cursor:pointer;
                transition:all var(--duration-fast);
              ">${t.label}</button>`).join('')}
          </nav>
          <div id="admin-subtab-content"></div>
        </div>`;

      container.querySelectorAll('[data-subtab]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.dataset.subtab;
          renderShell();
          loadTab();
        });
      });
    }

    function loadTab() {
      const el = container.querySelector('#admin-subtab-content');
      if (!el) return;
      if (activeTab === 'stats')              renderStatsTab(el);
      else if (activeTab === 'users')         renderUsersTab(el);
      else if (activeTab === 'announcements') renderAnnouncementsTab(el);
    }

    renderShell();
    loadTab();
  },
};
