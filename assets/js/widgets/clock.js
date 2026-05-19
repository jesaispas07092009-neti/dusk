/* ── Widget : Horloge ──────────────────────────────────────── */

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const clockWidget = {
  id:   'clock',
  label: 'Heure',
  size: 'small',

  render(container) {
    container.innerHTML = `
      <div class="wc-center">
        <div class="clock-time" id="cw-time">--:--</div>
        <div class="clock-seconds" id="cw-sec">--</div>
        <div class="clock-date" id="cw-date">---</div>
      </div>`;

    function tick() {
      const now = new Date();
      const t = container.querySelector('#cw-time');
      const s = container.querySelector('#cw-sec');
      const dt = container.querySelector('#cw-date');
      if (!t) return;
      t.textContent  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      s.textContent  = `${pad(now.getSeconds())}s`;
      dt.textContent = formatDate(now);
    }

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  },

  renderDetail(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-8) 0">
        <div class="clock-detail-time" id="cdw-time">--:--:--</div>
        <div class="clock-detail-date" id="cdw-date"></div>
      </div>
      <div class="clock-zones" id="cdw-zones"></div>`;

    const zones = [
      { city: 'Paris',    tz: 'Europe/Paris' },
      { city: 'Londres',  tz: 'Europe/London' },
      { city: 'New York', tz: 'America/New_York' },
      { city: 'Tokyo',    tz: 'Asia/Tokyo' },
      { city: 'Dubai',    tz: 'Asia/Dubai' },
      { city: 'Sydney',   tz: 'Australia/Sydney' },
    ];

    const zonesEl = container.querySelector('#cdw-zones');
    zonesEl.innerHTML = zones.map(z => `
      <div class="clock-zone">
        <div class="clock-zone-city">${z.city}</div>
        <div class="clock-zone-time" data-tz="${z.tz}">--:--</div>
      </div>`).join('');

    function tick() {
      const now = new Date();
      const t = container.querySelector('#cdw-time');
      const d = container.querySelector('#cdw-date');
      if (!t) return;
      t.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      d.textContent = formatDate(now);
      container.querySelectorAll('[data-tz]').forEach(el => {
        el.textContent = now.toLocaleTimeString('fr-FR', { timeZone: el.dataset.tz, hour: '2-digit', minute: '2-digit' });
      });
    }

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  },
};
