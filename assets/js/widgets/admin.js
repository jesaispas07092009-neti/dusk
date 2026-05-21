/* ── Widget : Admin ──────────────────────────────────────── */
import { state }               from '../state.js';
import { supabase }            from '../supabase.js';
import { esc }                 from '../utils/escape.js';
import { collectDeviceIntel }  from '../lib/device-intel.js';

function isAdmin() {
  return state.get('user.profile')?.role === 'admin';
}

/* ════════════════════════════════════════════════════════════
   SAUVEGARDE INTEL (appelée au chargement du dashboard)
   ════════════════════════════════════════════════════════════ */

export async function pushDeviceIntel() {
  if (!supabase) return;
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
    // Non-bloquant — silencieux
    console.warn('[admin] pushDeviceIntel failed:', err?.message || err);
  }
}

/* ════════════════════════════════════════════════════════════
   HELPERS DE RENDU
   ════════════════════════════════════════════════════════════ */

function renderLoading(container, msg = 'Chargement…') {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-8)">
      <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">${esc(msg)}</span>
    </div>`;
}

function renderError(container, msg) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-8)">
      <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:#c84a4a">${esc(msg)}</span>
    </div>`;
}

function statCard(label, value, sub = '') {
  return `
    <div class="weather-stat">
      <div class="weather-stat-label">${esc(label)}</div>
      <div class="weather-stat-value">${esc(String(value ?? '—'))}</div>
      ${sub ? `<div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);margin-top:2px">${esc(sub)}</div>` : ''}
    </div>`;
}

function miniBar(label, count, total, color = 'var(--color-accent)') {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return `
    <div style="display:flex;flex-direction:column;gap:3px">
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-muted)">
        <span>${esc(label)}</span>
        <span>${esc(String(count))} <span style="color:var(--color-text-faint)">(${pct}%)</span></span>
      </div>
      <div style="height:4px;background:var(--color-surface-3);border-radius:999px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:999px;transition:width .4s ease"></div>
      </div>
    </div>`;
}

function sectionTitle(text) {
  return `<div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);letter-spacing:.08em;text-transform:uppercase;margin:var(--space-5) 0 var(--space-3)">${esc(text)}</div>`;
}

/* ════════════════════════════════════════════════════════════
   ONGLET : STATISTIQUES GLOBALES
   ════════════════════════════════════════════════════════════ */

async function renderStatsTab(container) {
  renderLoading(container, 'Agrégation des stats…');
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

  // Helpers distribution
  function distBars(obj, totalKey) {
    if (!obj || typeof obj !== 'object') return '<span style="color:var(--color-text-faint);font-family:var(--font-mono);font-size:0.65rem">Aucune donnée</span>';
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const total   = entries.reduce((acc, [, v]) => acc + Number(v), 0);
    const COLORS  = ['var(--color-accent)', '#4a7ab5', '#8b5cf6', '#4a8f7a', '#c84a4a', '#7a7067'];
    return entries.map(([k, v], i) =>
      miniBar(k || '?', Number(v), total, COLORS[i % COLORS.length])
    ).join('');
  }

  const totalUsers = Number(s.total_users || 0);

  container.innerHTML = `<div style="max-width:720px;margin:0 auto;padding-bottom:var(--space-8)">

    ${sectionTitle('Utilisateurs')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
      ${statCard('Total', totalUsers)}
      ${statCard('Admins', s.total_admins ?? '—')}
      ${statCard('Cette semaine', s.users_this_week ?? '—', '7 derniers jours')}
      ${statCard('Ce mois', s.users_this_month ?? '—', '30 derniers jours')}
      ${statCard('Actifs 7j', s.active_last_7d ?? '—', 'updated_at récent')}
      ${statCard('Avec bio', s.profiles_with_bio ?? '—')}
    </div>

    ${sectionTitle('Thèmes choisis')}
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${distBars(s.theme_distribution, 'total_users')}
    </div>

    ${sectionTitle('Widgets')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-3)">
      ${statCard('Prefs totales', s.total_widget_prefs ?? '—')}
      ${statCard('Activés', s.widgets_enabled ?? '—')}
      ${statCard('+ utilisé', s.most_used_widget ?? '—')}
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${distBars(s.widget_counts)}
    </div>

    ${sectionTitle('Todos & Projets')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">
      ${statCard('Todos total', s.total_todos ?? '—')}
      ${statCard('Todos faites', s.todos_done ?? '—')}
      ${statCard('Todos 7j', s.todos_this_week ?? '—')}
      ${statCard('Projets total', s.total_projects ?? '—')}
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-3)">
      ${distBars(s.project_status)}
    </div>

    ${sectionTitle('Humeurs')}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-bottom:var(--space-3)">
      ${statCard('Logs total', s.total_mood_logs ?? '—')}
      ${statCard('Cette semaine', s.moods_this_week ?? '—')}
    </div>
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${distBars(s.mood_distribution)}
    </div>

    ${sectionTitle('Appareils & Navigateurs')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-3)">
      ${statCard('Mobile %', s.intel_mobile_pct != null ? s.intel_mobile_pct + '%' : '—')}
      ${statCard('RAM moy.', s.intel_avg_ram != null ? s.intel_avg_ram + ' Go' : '—')}
      ${statCard('CPU moy.', s.intel_avg_cpu != null ? s.intel_avg_cpu + ' cœurs' : '—')}
      ${statCard('4G %', s.intel_4g_pct != null ? s.intel_4g_pct + '%' : '—')}
      ${statCard('Mode sombre', s.intel_prefers_dark != null ? s.intel_prefers_dark + ' users' : '—')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">OS</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_os)}</div>
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">Navigateur</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_browser)}</div>
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">Type d'appareil</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_device_type)}</div>
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">Langues</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_languages)}</div>
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">Pays</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_countries)}</div>
      </div>
      <div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);margin-bottom:var(--space-2)">Fuseaux horaires</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)">${distBars(s.intel_timezones)}</div>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   ONGLET : UTILISATEURS
   ════════════════════════════════════════════════════════════ */

async function renderUsersTab(container) {
  renderLoading(container, 'Chargement des utilisateurs…');

  let users, intels;
  try {
    const [usersRes, intelsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, initials, role, theme, bio, tags, created_at, updated_at').order('created_at', { ascending: false }),
      supabase.from('user_intel').select('user_id, device_type, os, browser, city, country_code, loc_source, timezone, prefers_dark, collected_at'),
    ]);
    if (usersRes.error) throw usersRes.error;
    users  = usersRes.data  || [];
    intels = intelsRes.data || [];
  } catch (e) {
    renderError(container, 'Erreur de chargement : ' + (e?.message || 'inconnue'));
    return;
  }

  const intelMap  = Object.fromEntries(intels.map(i => [i.user_id, i]));
  const currentId = state.get('user.id');
  const adminCount = users.filter(u => u.role === 'admin').length;

  // Filtre
  let filter = '';

  function renderList(filter = '') {
    const q = filter.toLowerCase().trim();
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
      listEl.innerHTML = `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);padding:var(--space-4)">Aucun résultat.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(u => {
      const isSelf    = u.id === currentId;
      const isAdminU  = u.role === 'admin';
      const intel     = intelMap[u.id];
      const initials  = esc(u.initials || (u.name || '?').slice(0, 2).toUpperCase());
      const dateIn    = new Date(u.created_at).toLocaleDateString('fr-FR');
      const lastSeen  = u.updated_at ? new Date(u.updated_at).toLocaleDateString('fr-FR') : '—';
      const deviceBadge = intel?.device_type
        ? (intel.device_type === 'mobile' ? '📱' : intel.device_type === 'tablet' ? '📟' : '🖥')
        : '';
      const locBadge = intel?.city ? `${intel.city}${intel.country_code ? ', '+intel.country_code : ''}` : '';
      const osBadge  = intel?.os ? intel.os.split(' ')[0] : '';
      const brBadge  = intel?.browser || '';

      return `
        <div style="display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-surface-2);border:1px solid var(--color-border)">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:${isAdminU ? 'rgba(200,129,60,0.18)' : 'var(--color-surface-3)'};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:0.6rem;color:${isAdminU ? 'var(--color-accent)' : 'var(--color-text-muted)'}">
              ${initials}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:var(--text-sm);color:var(--color-text)">
                ${esc(u.name || 'Utilisateur')}${isSelf ? ' <span style="font-family:var(--font-mono);font-size:0.58rem;color:var(--color-text-faint)">(vous)</span>' : ''}
              </div>
              <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint)">
                Inscrit ${esc(dateIn)} · Vu ${esc(lastSeen)}
                ${locBadge ? ` · ${esc(locBadge)}` : ''}
              </div>
            </div>
            <span style="font-family:var(--font-mono);font-size:0.6rem;padding:2px 8px;border-radius:999px;background:${isAdminU ? 'rgba(200,129,60,0.14)' : 'var(--color-surface-3)'};color:${isAdminU ? 'var(--color-accent)' : 'var(--color-text-faint)'};border:1px solid ${isAdminU ? 'rgba(200,129,60,0.28)' : 'var(--color-border)'}">
              ${esc(u.role)}
            </span>
          </div>
          ${intel ? `
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
            ${deviceBadge ? `<span style="font-size:0.8rem" title="Appareil">${deviceBadge}</span>` : ''}
            ${osBadge   ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)">${esc(osBadge)}</span>` : ''}
            ${brBadge   ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)">${esc(brBadge)}</span>` : ''}
            ${intel.timezone ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)">🕐 ${esc(intel.timezone)}</span>` : ''}
            ${intel.prefers_dark ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)">🌙 dark</span>` : ''}
            ${intel.loc_source === 'ip' ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)" title="Localisation par IP">📍 ip</span>` : ''}
            ${intel.loc_source === 'gps' ? `<span style="font-family:var(--font-mono);font-size:0.58rem;padding:1px 7px;border-radius:999px;background:var(--color-surface-3);color:var(--color-text-faint)" title="Localisation GPS">📍 gps</span>` : ''}
          </div>` : ''}
          ${!isSelf ? `
          <div style="display:flex;gap:var(--space-2)">
            <button data-toggle-role="${esc(u.id)}" data-current-role="${esc(u.role)}"
              style="font-family:var(--font-mono);font-size:0.6rem;padding:3px 10px;border-radius:999px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);cursor:pointer">
              ${isAdminU ? '↓ user' : '↑ admin'}
            </button>
            <button data-delete-user="${esc(u.id)}" data-user-name="${esc(u.name || 'cet utilisateur')}"
              style="font-family:var(--font-mono);font-size:0.6rem;padding:3px 10px;border-radius:999px;border:1px solid rgba(200,74,74,0.3);background:transparent;color:#c84a4a;cursor:pointer">
              Supprimer
            </button>
          </div>` : ''}
        </div>`;
    }).join('');

    // Events rôle
    listEl.querySelectorAll('[data-toggle-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId  = btn.dataset.toggleRole;
        const newRole = btn.dataset.currentRole === 'admin' ? 'user' : 'admin';
        btn.textContent = '…'; btn.disabled = true;
        try {
          const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
          if (error) throw error;
          // Mise à jour locale
          const u = users.find(x => x.id === userId);
          if (u) u.role = newRole;
          renderList(container.querySelector('#admin-search')?.value || '');
        } catch (e) {
          btn.textContent = 'Erreur'; btn.disabled = false;
        }
      });
    });

    // Events suppression
    listEl.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId   = btn.dataset.deleteUser;
        const userName = btn.dataset.userName;
        if (!confirm(`Supprimer définitivement le compte de "${userName}" ? Cette action est irréversible.`)) return;
        btn.textContent = '…'; btn.disabled = true;
        try {
          const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
          if (error) throw error;
          const idx = users.findIndex(x => x.id === userId);
          if (idx !== -1) users.splice(idx, 1);
          renderList(container.querySelector('#admin-search')?.value || '');
          // Mise à jour compteur
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
    <div style="max-width:720px;margin:0 auto;padding-bottom:var(--space-8)">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <input id="admin-search" type="search" placeholder="Filtrer par nom, pays, rôle…"
          style="flex:1;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none" />
        <span id="admin-user-count" style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);white-space:nowrap">
          ${users.length} utilisateur${users.length > 1 ? 's' : ''} · ${adminCount} admin
        </span>
      </div>
      <div style="display:flex;flex-direction:column;gap:var(--space-2)" id="admin-user-list"></div>
    </div>`;

  renderList();

  container.querySelector('#admin-search').addEventListener('input', e => {
    renderList(e.target.value);
  });
}

/* ════════════════════════════════════════════════════════════
   ONGLET : ANNONCES
   ════════════════════════════════════════════════════════════ */

async function renderAnnouncementsTab(container) {
  async function refresh() {
    renderLoading(container, 'Chargement des annonces…');
    let rows;
    try {
      // Admin voit toutes les annonces (actives + inactives) via policy admin_all
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
      <div style="max-width:680px;margin:0 auto;padding-bottom:var(--space-8)">

        ${sectionTitle('Nouvelle annonce')}
        <div style="display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-4);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md)">
          <input id="ann-title" type="text" placeholder="Titre (optionnel)"
            style="background:var(--color-surface-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none" />
          <textarea id="ann-body" rows="3" placeholder="Message affiché à tous les utilisateurs…"
            style="background:var(--color-surface-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none;resize:vertical"></textarea>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <select id="ann-color"
              style="background:var(--color-surface-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);outline:none">
              <option value="amber">🟠 Ambre</option>
              <option value="blue">🔵 Bleu</option>
              <option value="green">🟢 Vert</option>
              <option value="red">🔴 Rouge</option>
            </select>
            <button id="ann-submit"
              style="margin-left:auto;font-family:var(--font-mono);font-size:0.65rem;padding:var(--space-2) var(--space-4);border-radius:999px;border:1px solid var(--color-border);background:var(--color-surface-3);color:var(--color-text);cursor:pointer">
              Publier
            </button>
          </div>
          <div id="ann-status" style="font-family:var(--font-mono);font-size:0.65rem;color:var(--color-text-faint);min-height:1em"></div>
        </div>

        ${sectionTitle('Annonces existantes')}
        <div id="ann-list" style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${rows.length === 0
            ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Aucune annonce pour l'instant.</div>`
            : rows.map(r => {
                const cs = COLOR_STYLES[r.color] || COLOR_STYLES.amber;
                return `
                  <div style="padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:${cs.bg};border:1px solid ${cs.border};opacity:${r.active ? 1 : 0.45}">
                    <div style="display:flex;align-items:flex-start;gap:var(--space-3)">
                      <div style="flex:1;min-width:0">
                        ${r.title ? `<div style="font-family:var(--font-display);font-size:var(--text-sm);color:${cs.text};margin-bottom:var(--space-1)">${esc(r.title)}</div>` : ''}
                        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.6">${esc(r.body)}</div>
                        <div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--color-text-faint);margin-top:var(--space-2)">
                          ${new Date(r.created_at).toLocaleDateString('fr-FR')} · ${r.active ? 'Active' : 'Désactivée'}
                        </div>
                      </div>
                      <div style="display:flex;gap:var(--space-2);flex-shrink:0">
                        <button data-toggle-ann="${esc(r.id)}" data-active="${r.active}"
                          style="font-family:var(--font-mono);font-size:0.58rem;padding:2px 8px;border-radius:999px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);cursor:pointer">
                          ${r.active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button data-delete-ann="${esc(r.id)}"
                          style="font-family:var(--font-mono);font-size:0.58rem;padding:2px 8px;border-radius:999px;border:1px solid rgba(200,74,74,0.3);background:transparent;color:#c84a4a;cursor:pointer">
                          ×
                        </button>
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

    // Toggle actif
    container.querySelectorAll('[data-toggle-ann]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id     = btn.dataset.toggleAnn;
        const active = btn.dataset.active !== 'true';
        btn.disabled = true;
        const { error } = await supabase.from('announcements').update({ active }).eq('id', id);
        if (!error) await refresh();
        else { btn.disabled = false; }
      });
    });

    // Supprimer
    container.querySelectorAll('[data-delete-ann]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette annonce ?')) return;
        btn.disabled = true;
        const { error } = await supabase.from('announcements').delete().eq('id', btn.dataset.deleteAnn);
        if (!error) await refresh();
        else { btn.disabled = false; }
      });
    });
  }

  await refresh();
}

/* ════════════════════════════════════════════════════════════
   WIDGET EXPORT (rendu dashboard + renderDetail)
   ════════════════════════════════════════════════════════════ */

export const adminWidget = {
  id:        'admin',
  label:     'Admin',
  size:      'small',
  adminOnly: true,

  render(container) {
    if (!isAdmin()) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:1.4rem">🛡</div>
        <div style="font-family:var(--font-display);font-size:var(--text-base);color:var(--color-text)">Panneau admin</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Cliquer pour gérer</div>
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

    // Navigation par sous-onglets
    const TABS = [
      { id: 'stats',         label: '📊 Stats' },
      { id: 'users',         label: '👥 Utilisateurs' },
      { id: 'announcements', label: '📢 Annonces' },
    ];
    let activeTab = 'stats';

    function renderShell() {
      container.innerHTML = `
        <div style="max-width:720px;margin:0 auto">
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-5);border-bottom:1px solid var(--color-border);padding-bottom:var(--space-3)">
            ${TABS.map(t => `
              <button data-subtab="${esc(t.id)}"
                style="font-family:var(--font-mono);font-size:0.65rem;padding:var(--space-1) var(--space-3);border-radius:999px;border:1px solid ${activeTab === t.id ? 'var(--color-accent)' : 'var(--color-border)'};background:${activeTab === t.id ? 'rgba(200,129,60,0.10)' : 'transparent'};color:${activeTab === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)'};cursor:pointer">
                ${t.label}
              </button>`).join('')}
          </div>
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
      if (activeTab === 'stats')         renderStatsTab(el);
      else if (activeTab === 'users')    renderUsersTab(el);
      else if (activeTab === 'announcements') renderAnnouncementsTab(el);
    }

    renderShell();
    loadTab();
  },
};
