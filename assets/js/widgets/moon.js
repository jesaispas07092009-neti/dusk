/* ── Widget : Phase de lune ──────────────────────────────── */

const PHASES = [
  { name: 'Nouvelle lune',        emoji: '🌑', range: [0,   0.03] },
  { name: 'Premier croissant',    emoji: '🌒', range: [0.03,0.22] },
  { name: 'Premier quartier',     emoji: '🌓', range: [0.22,0.28] },
  { name: 'Gibbeuse croissante',  emoji: '🌔', range: [0.28,0.47] },
  { name: 'Pleine lune',          emoji: '🌕', range: [0.47,0.53] },
  { name: 'Gibbeuse décroissante',emoji: '🌖', range: [0.53,0.72] },
  { name: 'Dernier quartier',     emoji: '🌗', range: [0.72,0.78] },
  { name: 'Dernier croissant',    emoji: '🌘', range: [0.78,1]    },
];

function getMoonPhase(date = new Date()) {
  // Cycle lunaire depuis nouvelle lune de référence (Jan 6 2000)
  const ref  = new Date(2000, 0, 6, 18, 14);
  const diff = (date - ref) / (1000 * 60 * 60 * 24);
  const cycle = 29.53058770576;
  const age   = ((diff % cycle) + cycle) % cycle;
  const pct   = age / cycle;
  const phase = PHASES.find(p => pct >= p.range[0] && pct < p.range[1]) || PHASES[0];
  return { phase, pct: Math.round(pct * 100), age: Math.round(age * 10) / 10 };
}

export const moonWidget = {
  id:    'moon',
  label: 'Lune',
  size:  'small',

  render(container) {
    const { phase, pct } = getMoonPhase();
    container.innerHTML = `
      <div class="wc-center">
        <div class="moon-symbol">${phase.emoji}</div>
        <div class="moon-phase-name">${phase.name}</div>
        <div class="moon-pct">${pct}%</div>
      </div>`;
  },

  renderDetail(container) {
    const { phase, pct, age } = getMoonPhase();
    const nextFull = 29.53 * (1 - pct / 100);

    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-8) 0">
        <div style="font-size:5rem;line-height:1;margin-bottom:var(--space-4)">${phase.emoji}</div>
        <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text)">${phase.name}</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-amber);margin-top:var(--space-2);letter-spacing:0.1em">Illumination : ${pct}%</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);max-width:500px;margin:0 auto">
        <div class="weather-stat"><div class="weather-stat-label">Âge</div><div class="weather-stat-value">${age}j</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Illumination</div><div class="weather-stat-value">${pct}%</div></div>
        <div class="weather-stat"><div class="weather-stat-label">Prochaine pleine</div><div class="weather-stat-value">~${Math.round(nextFull)}j</div></div>
      </div>
      <div style="margin-top:var(--space-8)">
        <div class="detail-heading">Cycle lunaire</div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
          ${PHASES.map(p => `
            <div style="text-align:center;opacity:${p.name === phase.name ? '1' : '0.35'};transition:opacity 0.3s">
              <div style="font-size:1.6rem">${p.emoji}</div>
              <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-muted);margin-top:4px;letter-spacing:0.05em">${p.name.split(' ')[0]}</div>
            </div>`).join('')}
        </div>
      </div>`;
  },
};
