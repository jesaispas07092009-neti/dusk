/* ── Widget : Citation ───────────────────────────────────── */

const QUOTES = [
  { text: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
  { text: "Tout ce que je sais, c'est que je ne sais rien.", author: "Socrate" },
  { text: "La vie est ce qui arrive pendant que vous faites d'autres projets.", author: "John Lennon" },
  { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Gandhi" },
  { text: "L'imagination est plus importante que la connaissance.", author: "Albert Einstein" },
  { text: "Il faut toujours viser la lune, car même en cas d'échec, on atterrit dans les étoiles.", author: "Oscar Wilde" },
  { text: "La simplicité est la sophistication suprême.", author: "Léonard de Vinci" },
  { text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", author: "Sénèque" },
  { text: "Le bonheur n'est pas quelque chose de tout fait. Il vient de vos propres actions.", author: "Dalaï Lama" },
  { text: "Un jour ou l'autre, ceux qui gagnent sont ceux qui pensent qu'ils le peuvent.", author: "Richard Bach" },
  { text: "La créativité, c'est l'intelligence qui s'amuse.", author: "Albert Einstein" },
  { text: "Ce n'est pas la destination qui compte, mais le voyage.", author: "Ralph Waldo Emerson" },
];

let currentIdx = Math.floor(Math.random() * QUOTES.length);

export const quoteWidget = {
  id:    'quote',
  label: 'Citation',
  size:  'medium',

  render(container) {
    const q = QUOTES[currentIdx];
    container.innerHTML = `
      <div class="wc-fill" style="justify-content:center;gap:var(--space-3)">
        <div style="color:var(--color-amber);font-size:1.5rem;line-height:1;opacity:0.5">"</div>
        <div class="quote-text">${q.text}</div>
        <div class="quote-author">— ${q.author}</div>
      </div>`;
  },

  renderDetail(container) {
    function render() {
      const q = QUOTES[currentIdx];
      container.innerHTML = `
        <div style="padding:var(--space-8) 0;max-width:600px;margin:0 auto;text-align:center">
          <div style="color:var(--color-amber);font-size:4rem;line-height:1;font-family:var(--font-display);opacity:0.3;margin-bottom:var(--space-4)">"</div>
          <div class="quote-detail-text">${q.text}</div>
          <div class="quote-author" style="font-size:var(--text-sm);margin-top:var(--space-4)">— ${q.author}</div>
          <button class="quote-btn" id="quote-next" style="margin:var(--space-8) auto 0">
            ↻ Nouvelle citation
          </button>
        </div>`;

      container.querySelector('#quote-next').addEventListener('click', () => {
        currentIdx = (currentIdx + 1) % QUOTES.length;
        render();
      });
    }
    render();
  },
};
