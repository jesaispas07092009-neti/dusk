/* ═══════════════════════════════════════════════════════════
   DUSK — settings.js
═══════════════════════════════════════════════════════════ */
import { state }                                from './state.js';
import { signOut }                              from './auth.js';
import { saveProfile, saveWidgetPrefs }         from './user-data.js';
import { getWidgetRegistry, WIDGET_REGISTRY_ALL } from './registry.js';
import { renderGrid }                           from './grid.js';
import { openAuth }                             from './auth-ui.js';

const ROOT_ID = 'settings-root';

function root() { return document.getElementById(ROOT_ID); }

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function closeSettings() {
  state.set('ui.settingsOpen', false);
  const el = root();
  if (!el) return;
  el.classList.remove('is-open');
  el.innerHTML = '';
}

function openSettingsTab(tab = 'profile') {
  state.set('ui.settingsOpen', true);
  state.set('ui.settingsTab', tab);
  renderSettings();
}

function isAdmin() {
  return state.get('user.profile')?.role === 'admin';
}

function renderHeader(activeTab) {
  const tabs = [
    ['profile', 'Profil'],
    ['widgets', 'Widgets'],
    ['account', 'Compte'],
    ...(isAdmin() ? [['admin-tab', '🛡 Admin']] : []),
  ];
  return `
    <div class="settings-tabs" style="grid-template-columns:repeat(${tabs.length},1fr)" role="tablist">
      ${tabs.map(([id, label]) => `
        <button class="settings-tab ${activeTab === id ? 'active' : ''}" type="button" data-settings-tab="${id}">
          ${label}
        </button>`).join('')}
    </div>`;
}

function getPrefs() { return state.get('user.widgetPrefs') || []; }

function normalizedPrefs(nextPrefs) {
  return getWidgetRegistry().map((widget, position) => {
    const current = nextPrefs.find(p => p.widget_id === widget.id);
    return current
      ? { ...current, position }
      : { user_id: state.get('user.id'), widget_id: widget.id, enabled: true, position };
  });
}

/* ── Onglet Profil ── */
function renderProfileTab(container) {
  const profile = state.get('user.profile') || {};
  container.innerHTML = `
    <form class="settings-form" data-profile-form style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
      <label class="settings-field">
        <span>Initiales</span>
        <input name="initials" maxlength="3" value="${esc(profile.initials)}" />
      </label>
      <label class="settings-field">
        <span>Nom affiché</span>
        <input name="name" maxlength="80" value="${esc(profile.name)}" />
      </label>
      <label class="settings-field settings-field--full">
        <span>Rôle / titre</span>
        <input name="role" maxlength="80" value="${esc(profile.role)}" />
      </label>
      <label class="settings-field settings-field--full">
        <span>Bio</span>
        <textarea name="bio" rows="4">${esc(profile.bio)}</textarea>
      </label>
      <label class="settings-field settings-field--full">
        <span>Centres d'intérêt (séparés par des virgules)</span>
        <input name="tags" value="${esc(Array.isArray(profile.tags) ? profile.tags.join(', ') : '')}" />
      </label>
      <div class="settings-actions" style="grid-column:1/-1">
        <span id="profile-save-status" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)"></span>
        <button class="settings-primary" type="submit">Enregistrer</button>
      </div>
    </form>`;

  container.querySelector('[data-profile-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const form   = e.currentTarget;
    const status = container.querySelector('#profile-save-status');
    const btn    = form.querySelector('[type=submit]');

    btn.disabled = true;
    btn.textContent = '…';
    status.textContent = '';

    try {
      const payload = {
        initials: form.initials.value.trim().slice(0, 3).toUpperCase() || 'DK',
        name:     form.name.value.trim() || 'Dusk',
        role:     form.role.value.trim() || 'Explorateur nocturne',
        bio:      form.bio.value.trim(),
        tags:     form.tags.value.split(',').map(t => t.trim()).filter(Boolean),
      };
      const userId  = state.get('user.id');
      const updated = await saveProfile(userId, payload);
      state.set('user.profile', updated);
      renderGrid();
      status.textContent = '✓ Sauvegardé';
      setTimeout(() => { status.textContent = ''; }, 2500);
    } catch (err) {
      status.style.color = '#c84a4a';
      status.textContent = 'Erreur : ' + (err.message || 'inconnue');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Enregistrer';
    }
  });
}

/* ── Onglet Widgets ── */
function renderWidgetsTab(container) {
  const registry = getWidgetRegistry();
  const prefs    = getPrefs();
  const byId     = new Map(prefs.map(p => [p.widget_id, p]));

  container.innerHTML = `
    <p style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-bottom:var(--space-3)">
      Active ou désactive les widgets affichés sur ton dashboard.
    </p>
    <div class="settings-widget-list">
      ${registry.map((widget, index) => {
        const pref = byId.get(widget.id) || { enabled: true, position: index };
        return `
          <label class="settings-widget-row">
            <div>
              <div class="settings-widget-title">${esc(widget.label)}</div>
              <div class="settings-widget-meta">${esc(widget.id)}</div>
            </div>
            <input type="checkbox" data-widget-toggle="${esc(widget.id)}" ${pref.enabled !== false ? 'checked' : ''} />
          </label>`;
      }).join('')}
    </div>`;

  container.querySelectorAll('[data-widget-toggle]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const widgetId = toggle.dataset.widgetToggle;
      const next = normalizedPrefs(
        getPrefs().map(p => p.widget_id === widgetId ? { ...p, enabled: toggle.checked } : p)
      );
      const userId = state.get('user.id');
      await saveWidgetPrefs(userId, next).catch(() => {});
      state.set('user.widgetPrefs', next);
      renderGrid();
    });
  });
}

/* ── Onglet Compte ── */
function renderAccountTab(container) {
  const session = state.get('session');
  const email   = session?.user?.email || state.get('user.email') || '—';
  const role    = state.get('user.profile')?.role || 'user';

  container.innerHTML = `
    <div class="settings-account">
      <div class="settings-account-card" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div>
          <div class="settings-account-label">Session</div>
          <div class="settings-account-value" style="word-break:break-all">${esc(email)}</div>
        </div>
        <div>
          <div class="settings-account-label">Rôle</div>
          <div class="settings-account-value">
            <span style="font-family:var(--font-mono);font-size:var(--text-xs);padding:3px 10px;border-radius:999px;background:${role === 'admin' ? 'rgba(200,129,60,0.14)' : 'var(--color-surface-3)'};color:${role === 'admin' ? 'var(--color-amber)' : 'var(--color-text-faint)'};border:1px solid ${role === 'admin' ? 'rgba(200,129,60,0.28)' : 'var(--color-border)'}">
              ${esc(role)}
            </span>
          </div>
        </div>
      </div>
      <button class="settings-danger" type="button" data-signout>Se déconnecter</button>
    </div>`;

  container.querySelector('[data-signout]').addEventListener('click', async () => {
    await signOut();
    closeSettings();
  });
}

/* ── Onglet Admin (admin seulement) ── */
function renderAdminTab(container) {
  if (!isAdmin()) {
    container.innerHTML = `<div style="padding:var(--space-8);text-align:center;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Accès refusé.</div>`;
    return;
  }

  const { supabase } = window._dusk_supabase || {};

  container.innerHTML = `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);padding:var(--space-4)">Chargement des utilisateurs…</div>`;

  import('./supabase.js').then(async ({ supabase }) => {
    if (!supabase) {
      container.innerHTML = `<div style="padding:var(--space-4);color:#c84a4a;font-family:var(--font-mono);font-size:var(--text-xs)">Supabase non configuré.</div>`;
      return;
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, initials, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      container.innerHTML = `<div style="padding:var(--space-4);color:#c84a4a;font-family:var(--font-mono);font-size:var(--text-xs)">Erreur : ${esc(error.message)}</div>`;
      return;
    }

    const currentId   = state.get('user.id');
    const adminCount  = (users || []).filter(u => u.role === 'admin').length;

    container.innerHTML = `
      <div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-bottom:var(--space-3)">
          ${(users || []).length} utilisateur${(users || []).length > 1 ? 's' : ''} · ${adminCount} admin${adminCount > 1 ? 's' : ''}
        </div>
        <div style="display:grid;gap:var(--space-2)" id="admin-users">
          ${(users || []).map(u => {
            const isSelf    = u.id === currentId;
            const isAdminU  = u.role === 'admin';
            const initials  = esc(u.initials || (u.name || '?').slice(0, 2).toUpperCase());
            return `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-surface-2);border:1px solid var(--color-border)">
                <div style="width:32px;height:32px;border-radius:50%;background:${isAdminU ? 'rgba(200,129,60,0.18)' : 'var(--color-surface-3)'};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:0.6rem;color:${isAdminU ? 'var(--color-amber)' : 'var(--color-text-muted)'}">
                  ${initials}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:var(--text-sm);color:var(--color-text)">${esc(u.name) || 'Utilisateur'}${isSelf ? ' <span style="opacity:.4;font-size:0.6rem">(vous)</span>' : ''}</div>
                  <div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--color-text-faint)">${new Date(u.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <span style="font-family:var(--font-mono);font-size:0.62rem;padding:3px 8px;border-radius:999px;background:${isAdminU ? 'rgba(200,129,60,0.14)' : 'var(--color-surface-3)'};color:${isAdminU ? 'var(--color-amber)' : 'var(--color-text-faint)'};border:1px solid ${isAdminU ? 'rgba(200,129,60,0.28)' : 'var(--color-border)'}">
                  ${esc(u.role)}
                </span>
                ${!isSelf ? `
                  <button data-toggle-role="${esc(u.id)}" data-current-role="${esc(u.role)}"
                    style="font-family:var(--font-mono);font-size:0.62rem;padding:4px 10px;border-radius:999px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);cursor:pointer">
                    ${isAdminU ? '↓ user' : '↑ admin'}
                  </button>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;

    container.querySelectorAll('[data-toggle-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId  = btn.dataset.toggleRole;
        const newRole = btn.dataset.currentRole === 'admin' ? 'user' : 'admin';
        btn.textContent = '…';
        btn.disabled    = true;
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (!error) renderAdminTab(container);
        else { btn.textContent = 'Erreur'; btn.disabled = false; }
      });
    });
  });
}

/* ── Render principal ── */
export function renderSettings() {
  const el = root();
  if (!el) return;
  const activeTab = state.get('ui.settingsTab') || 'profile';
  state.set('ui.settingsOpen', true);
  el.classList.add('is-open');
  el.innerHTML = `
    <div class="settings-backdrop" data-settings-close></div>
    <aside class="settings-panel" role="dialog" aria-modal="true" aria-label="Paramètres Dusk">
      <header class="settings-panel__header">
        <div>
          <div class="settings-kicker">Paramètres</div>
          <h2 class="settings-title">Ton espace Dusk</h2>
        </div>
        <button class="settings-close" type="button" aria-label="Fermer" data-settings-close>×</button>
      </header>
      ${renderHeader(activeTab)}
      <div class="settings-content" data-settings-content></div>
    </aside>`;

  const content = el.querySelector('[data-settings-content]');
  if      (activeTab === 'widgets')   renderWidgetsTab(content);
  else if (activeTab === 'account')   renderAccountTab(content);
  else if (activeTab === 'admin-tab') renderAdminTab(content);
  else                                renderProfileTab(content);

  el.querySelectorAll('[data-settings-close]').forEach(btn => btn.addEventListener('click', closeSettings));
  el.querySelectorAll('[data-settings-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.set('ui.settingsTab', btn.dataset.settingsTab);
      renderSettings();
    });
  });
}

export function initSettings() {
  const btn = document.getElementById('btn-settings');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!state.get('session')) { openAuth('login'); return; }
    openSettingsTab(state.get('ui.settingsTab') || 'profile');
  });
}

export function refreshSettingsIfOpen() {
  if (state.get('ui.settingsOpen')) renderSettings();
}
