/* ── Widget : Liens ──────────────────────────────────────── */
import { state } from '../state.js';
import { getDefaultLinks, saveLinks } from '../user-data.js';

function getLinks() {
  return state.get('user.links') || getDefaultLinks();
}

export const linksWidget = {
  id: 'links',
  label: 'Liens',
  size: 'small',

  render(container) {
    const links = getLinks();
    container.innerHTML = `
      <div class="links-list">
        ${links.slice(0, 3).map(l => `
          <a class="link-item" href="${l.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <span class="link-icon">${l.emoji}</span>
            <span class="link-label">${l.label}</span>
            <span class="link-arrow">→</span>
          </a>`).join('')}
      </div>`;
  },

  renderDetail(container) {
    const links = getLinks();
    container.innerHTML = `
      <div style="max-width:480px;margin:0 auto">
        <div class="links-list">
          ${links.map(l => `
            <a class="link-item" href="${l.url}" target="_blank" rel="noopener" style="font-size:var(--text-base)">
              <span class="link-icon" style="font-size:1.3rem">${l.emoji}</span>
              <span class="link-label">${l.label}</span>
              <span class="link-arrow" style="font-size:var(--text-sm)">→</span>
            </a>`).join('')}
        </div>
      </div>`;
  },
};
