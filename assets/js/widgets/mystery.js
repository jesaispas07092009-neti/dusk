/* ── Widget : Mystère ────────────────────────────────────── */

const GLYPHS   = ['⟁','⊹','✦','⌖','⏣','⍟','⎔','⊕','⌬','⍝'];
const MESSAGES = [
  'Ce widget sait des choses.',
  'Quelque chose se prépare…',
  'Les données convergent.',
  'Signal détecté.',
  'Analyse en cours…',
  'Veuillez patienter.',
  'Rien à voir ici.',
  'Ou peut-être que si.',
  'Le hasard n\'existe pas.',
  'Cliquer pour en savoir plus.',
];

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export const mysteryWidget = {
  id:    'mystery',
  label: '???',
  size:  'small',

  render(container) {
    let glyph = rnd(GLYPHS);
    let iv;

    container.innerHTML = `
      <div class="mystery-content">
        <div class="mystery-glyph" id="mys-glyph">${glyph}</div>
        <div class="mystery-text" id="mys-text">${rnd(MESSAGES)}</div>
      </div>`;

    iv = setInterval(() => {
      const g = container.querySelector('#mys-glyph');
      const t = container.querySelector('#mys-text');
      if (g) g.textContent = rnd(GLYPHS);
      if (t) t.textContent = rnd(MESSAGES);
    }, 4000);

    return () => clearInterval(iv);
  },

  renderDetail(container) {
    let clicks = 0;

    const REVELATIONS = [
      { glyph: '⟁', title: 'Début', text: 'Tout commence par un clic. Tu viens de le faire.' },
      { glyph: '⊹', title: 'Signal', text: 'Ce widget génère aléatoirement des symboles et des messages depuis une liste codée en dur. Pas de magie.' },
      { glyph: '✦', title: 'Vérité', text: 'Mais la vraie magie, c\'est toi qui la cherches en cliquant encore.' },
      { glyph: '⌖', title: 'Choix', text: 'Tu peux t\'arrêter. Ou continuer. Les deux sont valides.' },
      { glyph: '⍟', title: 'Infini', text: 'Ce widget peut générer jusqu\'à ∞ révélations. Chacune aussi vide ou riche que tu veux.' },
      { glyph: '⎔', title: 'Fin ?', text: 'Il n\'y a pas de fin. Il y a juste le prochain clic.' },
    ];

    function render() {
      const rev = REVELATIONS[clicks % REVELATIONS.length];
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;text-align:center;padding:var(--space-8)">
          <div style="font-size:4rem;margin-bottom:var(--space-4);animation:mystery-spin 6s linear infinite">${rev.glyph}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-amber);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:var(--space-4)">${rev.title}</div>
          <div style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--color-text);line-height:1.6;max-width:400px;margin-bottom:var(--space-8)">${rev.text}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-bottom:var(--space-4)">${clicks + 1} / ∞</div>
          <button class="quote-btn" id="mys-next">Révélation suivante →</button>
        </div>`;

      container.querySelector('#mys-next').addEventListener('click', () => {
        clicks++;
        render();
      });
    }

    render();
  },
};
