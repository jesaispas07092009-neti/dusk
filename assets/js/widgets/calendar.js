/* ── Widget : Calendrier ─────────────────────────────────── */

const DAYS   = ['L','M','M','J','V','S','D'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin',
                'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function buildCalendar(year, month) {
  const first    = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInM  = new Date(year, month + 1, 0).getDate();
  const startCol = (first + 6) % 7; // lundi en premier
  return { startCol, daysInM };
}

export const calendarWidget = {
  id:    'calendar',
  label: 'Calendrier',
  size:  'medium',
  expandable: true,

  render(container) {
    const now   = new Date();
    const today = now.getDate();
    const month = now.getMonth();
    const year  = now.getFullYear();
    const { startCol, daysInM } = buildCalendar(year, month);

    let cells = '';
    for (let i = 0; i < startCol; i++) cells += `<div></div>`;
    for (let d = 1; d <= daysInM; d++) {
      const isToday = d === today;
      cells += `<div style="
        display:flex;align-items:center;justify-content:center;
        aspect-ratio:1;border-radius:50%;font-size:var(--text-xs);
        font-family:var(--font-mono);
        ${isToday
          ? 'background:var(--color-amber);color:var(--color-bg);font-weight:500;'
          : 'color:var(--color-text-muted);'}
      ">${d}</div>`;
    }

    container.innerHTML = `
      <div class="wc-fill" style="gap:var(--space-2)">
        <div style="font-family:var(--font-display);font-size:var(--text-sm);color:var(--color-text);margin-bottom:var(--space-1)">
          ${MONTHS[month]} ${year}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">
          ${DAYS.map(d => `<div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:0.05em">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>`;
  },

  renderDetail(container) {
    const now   = new Date();
    let viewY   = now.getFullYear();
    let viewM   = now.getMonth();

    function render() {
      const today = (viewY === now.getFullYear() && viewM === now.getMonth()) ? now.getDate() : -1;
      const { startCol, daysInM } = buildCalendar(viewY, viewM);

      let cells = '';
      for (let i = 0; i < startCol; i++) cells += `<div></div>`;
      for (let d = 1; d <= daysInM; d++) {
        const isToday = d === today;
        cells += `<div style="
          display:flex;align-items:center;justify-content:center;
          aspect-ratio:1;border-radius:50%;font-size:var(--text-sm);
          font-family:var(--font-mono);cursor:default;
          ${isToday
            ? 'background:var(--color-amber);color:var(--color-bg);font-weight:500;'
            : 'color:var(--color-text-muted);'}
        ">${d}</div>`;
      }

      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6)">
          <button id="cal-prev" style="padding:var(--space-2) var(--space-3);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-muted);cursor:pointer">‹</button>
          <span style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">${MONTHS[viewM]} ${viewY}</span>
          <button id="cal-next" style="padding:var(--space-2) var(--space-3);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);color:var(--color-text-muted);cursor:pointer">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:var(--space-2);text-align:center;max-width:420px;margin:0 auto">
          ${DAYS.map(d => `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);letter-spacing:0.1em;padding-bottom:var(--space-2)">${d}</div>`).join('')}
          ${cells}
        </div>`;

      container.querySelector('#cal-prev').addEventListener('click', () => {
        viewM--; if (viewM < 0) { viewM = 11; viewY--; } render();
      });
      container.querySelector('#cal-next').addEventListener('click', () => {
        viewM++; if (viewM > 11) { viewM = 0; viewY++; } render();
      });
    }

    render();
  },
};
