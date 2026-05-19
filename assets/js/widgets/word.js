/* ── Widget : Mot du jour ────────────────────────────────── */

const WORDS = [
  { word: 'Sérendipité',  type: 'nom fém.',   def: 'Faculté de faire par hasard une découverte heureuse et de la reconnaître comme telle.' },
  { word: 'Ineffable',    type: 'adj.',        def: 'Qui ne peut pas être exprimé par des paroles, qui dépasse toute expression.' },
  { word: 'Pétrichor',    type: 'nom masc.',   def: 'Odeur de la pluie sur la terre sèche, due aux huiles végétales et à la géosmine.' },
  { word: 'Quiétude',     type: 'nom fém.',    def: 'Tranquillité, calme parfait de l\'esprit ou des lieux.' },
  { word: 'Vellichor',    type: 'nom masc.',   def: 'Étrange mélancolie des librairies d\'occasion et du temps qui passe.' },
  { word: 'Ataraxie',     type: 'nom fém.',    def: 'Tranquillité absolue de l\'âme, absence de trouble, sérénité parfaite.' },
  { word: 'Épiphanie',    type: 'nom fém.',    def: 'Apparition soudaine de la nature essentielle d\'une chose, moment de révélation.' },
  { word: 'Lacunaire',    type: 'adj.',        def: 'Qui présente des lacunes, des vides, des manques.' },
  { word: 'Synesthésie',  type: 'nom fém.',    def: 'Phénomène dans lequel un stimulus sensoriel produit automatiquement une autre sensation.' },
  { word: 'Funambule',    type: 'nom',         def: 'Acrobate qui marche sur la corde raide ; personne qui pratique un équilibre délicat.' },
  { word: 'Labile',       type: 'adj.',        def: 'Qui se transforme, se décompose facilement ; instable, changeant.' },
  { word: 'Palimpseste',  type: 'nom masc.',   def: 'Manuscrit dont on a effacé la première écriture pour le réutiliser ; superposition de traces.' },
];

// Mot du jour basé sur la date
const todayIdx = new Date().getDate() % WORDS.length;

export const wordWidget = {
  id:    'word',
  label: 'Mot du jour',
  size:  'small',

  render(container) {
    const w = WORDS[todayIdx];
    container.innerHTML = `
      <div class="wc-fill" style="justify-content:center;gap:var(--space-1)">
        <div class="word-main">${w.word}</div>
        <div class="word-type">${w.type}</div>
        <div class="word-def">${w.def}</div>
      </div>`;
  },

  renderDetail(container) {
    const w = WORDS[todayIdx];
    container.innerHTML = `
      <div style="padding:var(--space-6) 0;max-width:600px;margin:0 auto">
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:var(--space-4)">Mot du ${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long'})}</div>
        <div style="font-family:var(--font-display);font-size:clamp(2rem,6vw,3.5rem);color:var(--color-text);line-height:1">${w.word}</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-amber);font-style:italic;margin-top:var(--space-2);letter-spacing:0.05em">${w.type}</div>
        <div style="font-size:var(--text-base);color:var(--color-text-muted);line-height:1.7;margin-top:var(--space-6);padding:var(--space-5);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md)">${w.def}</div>
        <div style="margin-top:var(--space-8)">
          <div class="detail-heading">Autres mots notables</div>
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            ${WORDS.filter((_, i) => i !== todayIdx).slice(0, 4).map(ow => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm)">
                <span style="font-family:var(--font-display);font-size:var(--text-base);color:var(--color-text)">${ow.word}</span>
                <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);font-style:italic">${ow.type}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },
};
