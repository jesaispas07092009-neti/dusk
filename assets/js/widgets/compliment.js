/* ── Widget : Compliment ─────────────────────────────────── */

const COMPLIMENTS = [
  "Tu as une façon unique de voir le monde qui inspire ceux qui t'entourent.",
  "Ta curiosité est une lumière que tu portes partout avec toi.",
  "Tu sais exactement quand quelqu'un a besoin d'un mot doux.",
  "Ton calme face aux situations difficiles est vraiment admirable.",
  "Ta créativité est une ressource infinie et précieuse.",
  "Tu rends les choses simples belles et les belles choses accessibles.",
  "Ton sens de l'humour illumine les journées les plus ternes.",
  "Tu as le don rare de rendre les autres meilleurs par ta seule présence.",
  "Tes idées méritent d'être entendues. Continue de les partager.",
  "Tu es plus courageux·se que tu ne le penses.",
  "Chaque journée que tu traverses avec élégance est une petite victoire.",
  "Le monde est meilleur parce que tu y es.",
];

let idx = Math.floor(Math.random() * COMPLIMENTS.length);

export const complimentWidget = {
  id:    'compliment',
  label: 'Pour toi',
  size:  'small',

  render(container) {
    function show() {
      container.innerHTML = `
        <div class="wc-center" style="gap:var(--space-3);padding:var(--space-2)">
          <div style="font-size:1.5rem">✨</div>
          <div class="compliment-text">${COMPLIMENTS[idx]}</div>
          <div class="compliment-refresh" id="comp-refresh">↻ autre</div>
        </div>`;
      container.querySelector('#comp-refresh').addEventListener('click', (e) => {
        e.stopPropagation();
        idx = (idx + 1) % COMPLIMENTS.length;
        show();
      });
    }
    show();
  },

  renderDetail(container) {
    function show() {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;text-align:center;padding:var(--space-8)">
          <div style="font-size:3rem;margin-bottom:var(--space-6)">✨</div>
          <div style="font-family:var(--font-display);font-size:clamp(1.1rem,3vw,1.6rem);font-style:italic;color:var(--color-text);line-height:1.6;max-width:500px">${COMPLIMENTS[idx]}</div>
          <button class="quote-btn" id="comp-next" style="margin-top:var(--space-8)">↻ Un autre</button>
        </div>`;
      container.querySelector('#comp-next').addEventListener('click', () => {
        idx = (idx + 1) % COMPLIMENTS.length;
        show();
      });
    }
    show();
  },
};
