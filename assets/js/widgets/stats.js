/* ── Widget : Activité Dusk ─────────────────────────────── */
import { buildActivityRows, buildActivitySnapshot, formatDuration } from '../lib/metrics.js';
import { esc } from '../utils/escape.js';

function renderRows(rows, showNote = false) {
  return rows.map(row => `
    <div class="sys-stat">
      <div class="sys-stat-label">
        <span>${esc(row.label)}</span>
        <span>${esc(row.value)}</span>
      </div>
      <div class="sys-bar">
        <div class="sys-bar-fill" style="width:${row.percent}%"></div>
      </div>
      ${showNote ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">${esc(row.note)}</div>` : ''}
    </div>
  `).join('');
}

function renderOverview(snapshot) {
  return `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-bottom:var(--space-5)">
      <div class="weather-stat">
        <div class="weather-stat-label">Session</div>
        <div class="weather-stat-value">${esc(formatDuration(snapshot.sessionMs))}</div>
      </div>
      <div class="weather-stat">
        <div class="weather-stat-label">Connexion</div>
        <div class="weather-stat-value">${esc(snapshot.connectivity.label)}</div>
      </div>
      <div class="weather-stat">
        <div class="weather-stat-label">Source</div>
        <div class="weather-stat-value">${esc(snapshot.connectivity.source)}</div>
      </div>
      <div class="weather-stat">
        <div class="weather-stat-label">Stockage Dusk</div>
        <div class="weather-stat-value">${esc(snapshot.storage.label)}</div>
      </div>
    </div>
  `;
}

export const statsWidget = {
  id: 'stats',
  label: 'Activité',
  size: 'small',

  render(container) {
    const rows = buildActivityRows();

    container.innerHTML = `
      <div class="wc-fill" style="justify-content:center;gap:var(--space-2)">
        ${renderRows(rows, false)}
      </div>`;
    return null;
  },

  renderDetail(container) {
    let timer = null;

    function draw() {
      const snapshot = buildActivitySnapshot();
      const rows = buildActivityRows();

      container.innerHTML = `
        <div style="max-width:620px;margin:0 auto">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:var(--space-6)">
            <div>
              <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text)">Activité Dusk</div>
              <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">
                ${esc(snapshot.widgets.active)} widgets actifs · ${esc(snapshot.todos.done)}/${esc(snapshot.todos.total)} todos · ${esc(snapshot.projects.active)}/${esc(snapshot.projects.total)} projets
              </div>
            </div>
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);text-align:right">
              Actualisé il y a quelques instants
            </div>
          </div>

          ${renderOverview(snapshot)}

          <div class="detail-heading">Répartition</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${renderRows(rows, true)}
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-top:var(--space-6)">
            <div class="weather-stat">
              <div class="weather-stat-label">Widgets cachés</div>
              <div class="weather-stat-value">${esc(snapshot.widgets.hidden)}</div>
            </div>
            <div class="weather-stat">
              <div class="weather-stat-label">Todos restantes</div>
              <div class="weather-stat-value">${esc(snapshot.todos.remaining)}</div>
            </div>
            <div class="weather-stat">
              <div class="weather-stat-label">Projets terminés</div>
              <div class="weather-stat-value">${esc(snapshot.projects.completed)}</div>
            </div>
          </div>
        </div>`;
    }

    draw();
    timer = setInterval(draw, 30_000);
    return () => {
      if (timer) clearInterval(timer);
    };
  },
};
