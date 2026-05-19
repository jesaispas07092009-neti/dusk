/* ── Widget : Horloge mondiale ───────────────────────────── */

const CITIES = [
  { city: 'Paris',      tz: 'Europe/Paris',         flag: '🇫🇷' },
  { city: 'Londres',    tz: 'Europe/London',         flag: '🇬🇧' },
  { city: 'New York',   tz: 'America/New_York',      flag: '🇺🇸' },
  { city: 'Los Angeles',tz: 'America/Los_Angeles',   flag: '🇺🇸' },
  { city: 'São Paulo',  tz: 'America/Sao_Paulo',     flag: '🇧🇷' },
  { city: 'Dubaï',      tz: 'Asia/Dubai',            flag: '🇦🇪' },
  { city: 'Mumbai',     tz: 'Asia/Kolkata',          flag: '🇮🇳' },
  { city: 'Singapour',  tz: 'Asia/Singapore',        flag: '🇸🇬' },
  { city: 'Tokyo',      tz: 'Asia/Tokyo',            flag: '🇯🇵' },
  { city: 'Sydney',     tz: 'Australia/Sydney',      flag: '🇦🇺' },
];

function pad(n) { return String(n).padStart(2, '0'); }

export const worldClockWidget = {
  id:    'world-clock',
  label: 'Monde',
  size:  'medium',

  render(container) {
    container.innerHTML = `
      <div class="wc-fill" style="gap:var(--space-2);overflow:hidden">
        ${CITIES.slice(0, 4).map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;
            padding:var(--space-1) 0;border-bottom:1px solid var(--color-border)">
            <span style="font-size:0.85rem">${c.flag} <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)">${c.city}</span></span>
            <span class="wc-zone-t" data-tz="${c.tz}" style="font-family:var(--font-display);font-size:var(--text-base);color:var(--color-text)">--:--</span>
          </div>`).join('')}
      </div>`;

    function tick() {
      const now = new Date();
      container.querySelectorAll('.wc-zone-t').forEach(el => {
        el.textContent = now.toLocaleTimeString('fr-FR', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit' });
      });
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  },

  renderDetail(container) {
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3)">
        ${CITIES.map(c => `
          <div class="clock-zone" style="text-align:center">
            <div style="font-size:1.5rem;margin-bottom:var(--space-2)">${c.flag}</div>
            <div class="clock-zone-city">${c.city}</div>
            <div class="clock-zone-time wcd-t" data-tz="${c.tz}">--:--</div>
          </div>`).join('')}
      </div>`;

    function tick() {
      const now = new Date();
      container.querySelectorAll('.wcd-t').forEach(el => {
        el.textContent = now.toLocaleTimeString('fr-FR', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit' });
      });
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  },
};
