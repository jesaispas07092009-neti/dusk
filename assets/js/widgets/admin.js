/* ── Widget : Admin ──────────────────────────────────────── */
import { state } from '../state.js';
import { supabase } from '../supabase.js';
import { esc } from '../utils/escape.js';

function isAdmin() {
  return state.get('user.profile')?.role === 'admin';
}

async function loadUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, initials, role, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function setRole(userId, role) {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  if (error) throw error;
}

export const adminWidget = {
  id: 'admin',
  label: 'Admin',
  size: 'small',
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
      container.innerHTML = `<div class="wc-center" style="padding:var(--space-8)"><div style="color:var(--color-text-muted);font-family:var(--font-mono);font-size:var(--text-sm)">Accès refusé.</div></div>`;
      return;
    }

    function renderLoading() {
      container.innerHTML = `<div class="wc-center" style="padding:var(--space-8)"><div style="color:var(--color-text-faint);font-family:var(--font-mono);font-size:var(--text-sm)">Chargement…</div></div>`;
    }

    function renderError(msg) {
      container.innerHTML = `<div class="wc-center" style="padding:var(--space-8)"><div style="color:#c84a4a;font-family:var(--font-mono);font-size:var(--text-sm)">${esc(msg)}</div></div>`;
    }

    async function renderUsers() {
      renderLoading();
      let users;
      try { users = await loadUsers(); }
      catch (e) { renderError('Erreur de chargement : ' + (e?.message || 'inconnue')); return; }

      const currentId = state.get('user.id');
      const adminCount = users.filter(u => u.role === 'admin').length;

      container.innerHTML = `
        <div style="max-width:640px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-6)">
            <div style="font-size:1.6rem">🛡</div>
            <div>
              <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">Panneau admin</div>
              <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">${users.length} utilisateur${users.length > 1 ? 's' : ''} · ${adminCount} admin${adminCount > 1 ? 's' : ''}</div>
            </div>
          </div>

          <div style="display:grid;gap:var(--space-2)" id="admin-user-list">
            ${users.map(u => {
              const isSelf = u.id === currentId;
              const isAdminUser = u.role === 'admin';
              const initials = u.initials || (u.name || '?').slice(0, 2).toUpperCase();
              return `
                <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-surface-2);border:1px solid var(--color-border)">
                  <div style="width:36px;height:36px;border-radius:50%;background:${isAdminUser ? 'rgba(200,129,60,0.18)' : 'var(--color-surface-3)'};display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:var(--text-xs);color:${isAdminUser ? 'var(--color-amber)' : 'var(--color-text-muted)'}">
                    ${esc(initials)}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:var(--text-sm);color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${esc(u.name || 'Utilisateur')}${isSelf ? ' <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint)">(vous)</span>' : ''}
                    </div>
                    <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">
                      ${new Date(u.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span style="font-family:var(--font-mono);font-size:0.65rem;padding:3px 10px;border-radius:999px;background:${isAdminUser ? 'rgba(200,129,60,0.14)' : 'var(--color-surface-3)'};color:${isAdminUser ? 'var(--color-amber)' : 'var(--color-text-faint)'};border:1px solid ${isAdminUser ? 'rgba(200,129,60,0.28)' : 'var(--color-border)'}">
                    ${esc(u.role)}
                  </span>
                  ${!isSelf ? `
                    <button
                      data-toggle-role="${esc(u.id)}"
                      data-current-role="${esc(u.role)}"
                      style="font-family:var(--font-mono);font-size:0.65rem;padding:4px 12px;border-radius:999px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);cursor:pointer"
                      title="${isAdminUser ? 'Rétrograder en user' : 'Promouvoir admin'}">
                      ${isAdminUser ? '↓ user' : '↑ admin'}
                    </button>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`;

      container.querySelectorAll('[data-toggle-role]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = btn.dataset.toggleRole;
          const newRole = btn.dataset.currentRole === 'admin' ? 'user' : 'admin';
          btn.textContent = '…';
          btn.disabled = true;
          try {
            await setRole(userId, newRole);
            await renderUsers();
          } catch (e) {
            btn.textContent = 'Erreur';
            setTimeout(() => renderUsers(), 1500);
          }
        });
      });
    }

    renderUsers();
  },
};
