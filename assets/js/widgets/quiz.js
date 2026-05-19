/* ── Widget : Quiz ───────────────────────────────────────── */

const QUESTIONS = [
  { q: 'Quelle est la capitale de l\'Islande ?', opts: ['Reykjavik','Oslo','Helsinki','Tallinn'], ans: 0 },
  { q: 'En quelle année a été inventée la World Wide Web ?', opts: ['1983','1989','1991','1995'], ans: 1 },
  { q: 'Quel élément chimique a pour symbole "Au" ?', opts: ['Argent','Cuivre','Or','Aluminium'], ans: 2 },
  { q: 'Combien de cordes a un violon standard ?', opts: ['3','4','5','6'], ans: 1 },
  { q: 'Qui a peint "La Nuit étoilée" ?', opts: ['Monet','Picasso','Van Gogh','Dalí'], ans: 2 },
  { q: 'Quel pays est le plus grand du monde par superficie ?', opts: ['Canada','Chine','États-Unis','Russie'], ans: 3 },
  { q: 'Combien de planètes y a-t-il dans le système solaire ?', opts: ['7','8','9','10'], ans: 1 },
  { q: 'Quelle est la langue la plus parlée au monde ?', opts: ['Espagnol','Anglais','Mandarin','Hindi'], ans: 2 },
  { q: 'En quelle année Napoléon est-il né ?', opts: ['1759','1769','1779','1789'], ans: 1 },
  { q: 'Quel est le plus petit pays du monde ?', opts: ['Monaco','Saint-Marin','Vatican','Liechtenstein'], ans: 2 },
];

let qIdx   = 0;
let score  = 0;
let answered = false;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const shuffled = shuffle(QUESTIONS);

export const quizWidget = {
  id:    'quiz',
  label: 'Quiz',
  size:  'medium',

  render(container) {
    const q = shuffled[0];
    container.innerHTML = `
      <div class="wc-fill" style="gap:var(--space-2)">
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);letter-spacing:0.08em">Question du moment</div>
        <div style="font-family:var(--font-display);font-size:var(--text-sm);color:var(--color-text);line-height:1.4">${q.q}</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);margin-top:auto">Ouvrir pour jouer →</div>
      </div>`;
  },

  renderDetail(container) {
    qIdx = 0; score = 0; answered = false;

    function renderQ() {
      if (qIdx >= shuffled.length) {
        container.innerHTML = `
          <div style="text-align:center;padding:var(--space-10)">
            <div style="font-size:3rem;margin-bottom:var(--space-4)">🎉</div>
            <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text)">Score : ${score} / ${shuffled.length}</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-3)">
              ${score >= 8 ? 'Excellent !' : score >= 5 ? 'Bien joué !' : 'Continue de t\'entraîner !'}
            </div>
            <button class="quote-btn" id="quiz-restart" style="margin:var(--space-8) auto 0">↻ Recommencer</button>
          </div>`;
        container.querySelector('#quiz-restart').addEventListener('click', () => {
          qIdx = 0; score = 0; renderQ();
        });
        return;
      }

      const q = shuffled[qIdx];
      answered = false;

      container.innerHTML = `
        <div style="max-width:600px;margin:0 auto">
          <div class="quiz-meta">
            <span>Question ${qIdx + 1} / ${shuffled.length}</span>
            <span>Score : ${score}</span>
          </div>
          <div class="quiz-question">${q.q}</div>
          <div class="quiz-options">
            ${q.opts.map((opt, i) => `
              <button class="quiz-option" data-idx="${i}">${opt}</button>`).join('')}
          </div>
          <div id="quiz-feedback" style="margin-top:var(--space-4);font-family:var(--font-mono);font-size:var(--text-xs);letter-spacing:0.08em;min-height:1.5em"></div>
          <button class="quote-btn" id="quiz-next" style="margin-top:var(--space-4);display:none">Suivante →</button>
        </div>`;

      container.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const chosen = parseInt(btn.dataset.idx);
          const fb = container.querySelector('#quiz-feedback');
          container.querySelectorAll('.quiz-option').forEach((b, i) => {
            b.disabled = true;
            if (i === q.ans) b.classList.add('correct');
            else if (i === chosen) b.classList.add('wrong');
          });
          if (chosen === q.ans) {
            score++;
            fb.textContent = '✓ Bonne réponse !';
            fb.style.color = 'var(--color-amber)';
          } else {
            fb.textContent = `✗ La réponse était : ${q.opts[q.ans]}`;
            fb.style.color = '#d67d7d';
          }
          const nextBtn = container.querySelector('#quiz-next');
          nextBtn.style.display = 'inline-flex';
          nextBtn.addEventListener('click', () => { qIdx++; renderQ(); });
        });
      });
    }

    renderQ();
  },
};
