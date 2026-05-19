/* ── Widget : Memory ─────────────────────────────────────── */

const EMOJIS = ['🌙','⭐','🔥','💎','🌊','🍂','⚡','🌸'];

function createDeck(count = 8) {
  const pairs = EMOJIS.slice(0, count / 2).flatMap(e => [e, e]);
  return pairs.sort(() => Math.random() - 0.5).map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
}

export const memoryWidget = {
  id:    'memory',
  label: 'Memory',
  size:  'medium',

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:2rem">🎴</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);letter-spacing:0.08em">Jeu de mémoire</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Ouvrir pour jouer</div>
      </div>`;
  },

  renderDetail(container) {
    let deck, flipped, moves, matched, locked;

    function init() {
      deck    = createDeck(16);
      flipped = [];
      moves   = 0;
      matched = 0;
      locked  = false;
      render();
    }

    function render() {
      container.innerHTML = `
        <div style="max-width:480px;margin:0 auto">
          <div class="memory-stats">
            <span>Coups : ${moves}</span>
            <span>Trouvés : ${matched} / 8</span>
            <button class="quote-btn" id="mem-reset">↻ Nouveau</button>
          </div>
          <div class="memory-grid" style="grid-template-columns:repeat(4,1fr);gap:var(--space-2)">
            ${deck.map(card => `
              <div class="memory-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}"
                data-id="${card.id}" style="font-size:1.8rem;min-height:70px">
                <span>${card.flipped || card.matched ? card.emoji : ''}</span>
              </div>`).join('')}
          </div>
          ${matched === 8 ? `<div style="text-align:center;margin-top:var(--space-6);font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-amber)">🎉 Gagné en ${moves} coups !</div>` : ''}
        </div>`;

      container.querySelector('#mem-reset').addEventListener('click', init);

      container.querySelectorAll('.memory-card').forEach(el => {
        el.addEventListener('click', () => {
          const id   = parseInt(el.dataset.id);
          const card = deck[id];
          if (locked || card.flipped || card.matched) return;

          card.flipped = true;
          flipped.push(card);

          if (flipped.length === 2) {
            locked = true;
            moves++;
            const [a, b] = flipped;
            if (a.emoji === b.emoji) {
              a.matched = b.matched = true;
              matched++;
              flipped = [];
              locked  = false;
              render();
            } else {
              setTimeout(() => {
                a.flipped = b.flipped = false;
                flipped = [];
                locked  = false;
                render();
              }, 900);
              render();
            }
          } else {
            render();
          }
        });
      });
    }

    init();
  },
};
