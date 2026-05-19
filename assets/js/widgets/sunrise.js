/* ── Widget : Lever / Coucher du soleil ──────────────────── */
// Données simulées Paris — Pour une vraie implémentation,
// brancher l'API sunrise-sunset.org

const DATA = { sunrise: '06:24', sunset: '21:38', golden: '20:50', duration: '15h14' };

function minutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export const sunriseWidget = {
  id:    'sunrise',
  label: 'Soleil',
  size:  'small',

  render(container) {
    const now     = new Date();
    const nowMin  = now.getHours() * 60 + now.getMinutes();
    const riseMin = minutesSinceMidnight(DATA.sunrise);
    const setMin  = minutesSinceMidnight(DATA.sunset);
    const pct     = Math.max(0, Math.min(100, ((nowMin - riseMin) / (setMin - riseMin)) * 100));
    const isDay   = nowMin >= riseMin && nowMin <= setMin;

    container.innerHTML = `
      <div class="wc-fill" style="justify-content:center;gap:var(--space-3)">
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div class="wc-muted">Lever</div>
            <div class="sun-time-val">☀️ ${DATA.sunrise}</div>
          </div>
          <div style="font-size:1.2rem">${isDay ? '🌤' : '🌙'}</div>
          <div style="text-align:right">
            <div class="wc-muted">Coucher</div>
            <div class="sun-time-val">🌇 ${DATA.sunset}</div>
          </div>
        </div>
        <div style="height:6px;background:var(--color-surface-3);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(to right,#f59e0b,#ef4444);border-radius:3px;transition:width 1s"></div>
        </div>
        <div class="wc-muted" style="text-align:center">Durée du jour : ${DATA.duration}</div>
      </div>`;
  },

  renderDetail(container) {
    const nowMin  = new Date().getHours() * 60 + new Date().getMinutes();
    const riseMin = minutesSinceMidnight(DATA.sunrise);
    const setMin  = minutesSinceMidnight(DATA.sunset);
    const pct     = Math.max(0, Math.min(100, ((nowMin - riseMin) / (setMin - riseMin)) * 100));

    container.innerHTML = `
      <div style="padding:var(--space-8) 0;text-align:center">
        <div style="font-size:4rem">☀️</div>
        <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);margin-top:var(--space-3)">Durée du jour · ${DATA.duration}</div>
      </div>
      <div style="max-width:500px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)">
          <span>🌅 ${DATA.sunrise}</span><span>🌇 ${DATA.sunset}</span>
        </div>
        <div style="position:relative;height:12px;background:linear-gradient(to right,#1e3a5f,#f59e0b 40%,#ef4444 60%,#1a1040);border-radius:6px">
          <div style="position:absolute;top:50%;left:${pct.toFixed(1)}%;transform:translate(-50%,-50%);
            width:20px;height:20px;background:#fbbf24;border-radius:50%;box-shadow:0 0 12px #fbbf24;
            border:2px solid #fff"></div>
        </div>
        <div style="text-align:center;margin-top:var(--space-2);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-amber)">
          Position actuelle : ${pct.toFixed(0)}% de la journée
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-top:var(--space-8);max-width:500px;margin-left:auto;margin-right:auto">
        <div class="weather-stat"><div class="weather-stat-label">Lever</div><div class="weather-stat-value">${DATA.sunrise}</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Heure dorée</div><div class="weather-stat-value">${DATA.golden}</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Coucher</div><div class="weather-stat-value">${DATA.sunset}</div></div>
      </div>`;
  },
};
