/* ── Widget : Jeu de réflexe ─────────────────────────────── */

export const reflexWidget = {
  id:    'reflex',
  label: 'Réflexes',
  size:  'small',

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:1.5rem">⚡</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);letter-spacing:0.08em">Test de réflexes</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Ouvrir pour jouer</div>
      </div>`;
  },

  renderDetail(container) {
    let phase    = 'idle'; // idle | waiting | ready | result
    let startTime = 0;
    let times    = [];
    let timeout  = null;

    function render() {
      let targetStyle = '';
      let emoji = '⚡';
      let hint  = '';
      let resultHtml = '';

      if (phase === 'idle') {
        hint = 'Clique sur le cercle pour commencer';
        targetStyle = 'background:var(--color-surface-3);border-color:var(--color-border);cursor:pointer';
      } else if (phase === 'waiting') {
        hint = 'Attends...';
        targetStyle = 'background:var(--color-surface-3);border-color:var(--color-border);cursor:wait';
        emoji = '⏳';
      } else if (phase === 'ready') {
        hint = 'MAINTENANT ! Clique vite !';
        targetStyle = 'background:var(--color-amber-dim);border-color:var(--color-amber);cursor:pointer;animation:reflex-pulse 0.3s var(--ease-emerge)';
        emoji = '🟠';
      }

      if (times.length > 0) {
        const avg = Math.round(times.reduce((a,b) => a + b, 0) / times.length);
        const best = Math.min(...times);
        resultHtml = `
          <div style="display:flex;gap:var(--space-4);justify-content:center;flex-wrap:wrap;margin-top:var(--space-4)">
            <div class="weather-stat" style="min-width:100px;text-align:center">
              <div class="weather-stat-label">Dernier</div>
              <div class="weather-stat-value">${times[times.length-1]}ms</div>
            </div>
            <div class="weather-stat" style="min-width:100px;text-align:center">
              <div class="weather-stat-label">Meilleur</div>
              <div class="weather-stat-value">${best}ms</div>
            </div>
            <div class="weather-stat" style="min-width:100px;text-align:center">
              <div class="weather-stat-label">Moyenne</div>
              <div class="weather-stat-value">${avg}ms</div>
            </div>
          </div>`;
      }

      container.innerHTML = `
        <div class="reflex-area">
          <div class="reflex-target ${phase === 'ready' ? 'ready' : ''}" id="reflex-target" style="${targetStyle}">
            <span style="font-size:2rem">${emoji}</span>
          </div>
          <div class="reflex-result">${hint}</div>
          ${resultHtml}
          ${times.length > 0 ? `<button class="quote-btn" id="reflex-reset" style="margin-top:var(--space-2)">↻ Recommencer</button>` : ''}
        </div>`;

      const target = container.querySelector('#reflex-target');

      target.addEventListener('click', () => {
        if (phase === 'idle') {
          phase = 'waiting';
          render();
          const delay = 1500 + Math.random() * 2500;
          timeout = setTimeout(() => {
            phase = 'ready';
            startTime = Date.now();
            render();
          }, delay);
        } else if (phase === 'waiting') {
          clearTimeout(timeout);
          phase = 'idle';
          container.querySelector('.reflex-result').textContent = 'Trop tôt ! Réessaie.';
        } else if (phase === 'ready') {
          const rt = Date.now() - startTime;
          times.push(rt);
          phase = 'idle';
          render();
          container.querySelector('.reflex-result').textContent =
            rt < 200 ? `⚡ ${rt}ms — Incroyable !`
            : rt < 300 ? `✓ ${rt}ms — Excellent !`
            : rt < 500 ? `${rt}ms — Bien !`
            : `${rt}ms — Continue de t'entraîner !`;
        }
      });

      container.querySelector('#reflex-reset')?.addEventListener('click', () => {
        times = []; phase = 'idle'; render();
      });
    }

    render();
    return () => clearTimeout(timeout);
  },
};
