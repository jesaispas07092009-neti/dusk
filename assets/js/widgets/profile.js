/* ── Widget : Profil ─────────────────────────────────────── */
import { state } from '../state.js';
import { getDefaultProfile, saveProfile } from '../user-data.js';

function getProfile() {
  return state.get('user.profile') || getDefaultProfile();
}

export const profileWidget = {
  id: 'profile',
  label: 'Profil',
  size: 'small',

  render(container) {
    const profile = getProfile();
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);height:100%;justify-content:center">
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          <div class="profile-avatar">${profile.initials || 'DK'}</div>
          <div>
            <div class="profile-name">${profile.name || 'Dusk'}</div>
            <div class="profile-role">${profile.role || 'Explorateur nocturne'}</div>
          </div>
        </div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${profile.bio || ''}</div>
      </div>`;
  },

  renderDetail(container) {
    const profile = getProfile();
    container.innerHTML = `
      <div style="max-width:600px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:var(--space-5);margin-bottom:var(--space-8)">
          <div class="profile-avatar" style="width:72px;height:72px;font-size:var(--text-xl)">${profile.initials || 'DK'}</div>
          <div>
            <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text)">${profile.name || 'Dusk'}</div>
            <div class="profile-role">${profile.role || 'Explorateur nocturne'}</div>
          </div>
        </div>

        <div class="detail-heading">À propos</div>
        <p style="color:var(--color-text-muted);line-height:1.7;margin-bottom:var(--space-6)">${profile.bio || ''}</p>

        <div class="detail-heading">Intérêts</div>
        <div class="profile-tags" style="margin-bottom:var(--space-6)">
          ${(profile.tags || []).map(t => `<span class="profile-tag">${t}</span>`).join('')}
        </div>

        <div class="detail-heading">Statistiques</div>
        <div style="display:flex;gap:var(--space-4)">
          ${(profile.stats || []).map(s => `
            <div class="weather-stat" style="flex:1;text-align:center">
              <div class="weather-stat-label">${s.label}</div>
              <div class="weather-stat-value">${s.value}</div>
            </div>`).join('')}
        </div>
      </div>`;
  },
};
