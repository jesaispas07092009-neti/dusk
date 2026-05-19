/* ── Widget : Stats système (simulées) ───────────────────── */

function rnd(min, max) { return Math.round(Math.random() * (max - min) + min); }

export const statsWidget = {
  id:    'stats',
  label: 'Système',
  size:  'small',

  render(container) {
    const cpu = rnd(10, 65), ram = rnd(40, 75), disk = rnd(30, 55);
    container.innerHTML = `
      <div class="wc-fill" style="justify-content:center;gap:var(--space-2)">
        ${[['CPU', cpu], ['RAM', ram], ['Disque', disk]].map(([label, val]) => `
          <div class="sys-stat">
            <div class="sys-stat-label"><span>${label}</span><span>${val}%</span></div>
            <div class="sys-bar"><div class="sys-bar-fill" style="width:${val}%"></div></div>
          </div>`).join('')}
      </div>`;
  },

  renderDetail(container) {
    let iv;

    function render() {
      const cpu  = rnd(10, 70), ram  = rnd(40, 80);
      const disk = rnd(30, 60), net  = rnd(0, 30);
      const uptime = '3j 14h 22min';
      const temp   = rnd(45, 72);

      container.innerHTML = `
        <div style="max-width:560px;margin:0 auto">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
            <div class="weather-stat"><div class="weather-stat-label">Uptime</div><div class="weather-stat-value">${uptime}</div></div>
            <div class="weather-stat"><div class="weather-stat-label">Température</div><div class="weather-stat-value">${temp}°C</div></div>
          </div>
          <div class="detail-heading">Utilisation</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${[['CPU', cpu], ['Mémoire RAM', ram], ['Disque', disk], ['Réseau', net]].map(([label, val]) => `
              <div class="sys-stat">
                <div class="sys-stat-label"><span>${label}</span><span style="color:${val > 80 ? '#c84a4a' : val > 60 ? '#c8813c' : 'var(--color-text-muted)'}">${val}%</span></div>
                <div class="sys-bar" style="height:6px">
                  <div class="sys-bar-fill" style="width:${val}%;background:${val > 80 ? 'linear-gradient(to right,#c84a4a,#e06060)' : 'linear-gradient(to right,var(--color-amber),var(--color-amber-light))'}"></div>
                </div>
              </div>`).join('')}
          </div>
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);text-align:right;margin-top:var(--space-4)">Mis à jour toutes les 3s</div>
        </div>`;
    }

    render();
    iv = setInterval(render, 3000);
    return () => clearInterval(iv);
  },
};
