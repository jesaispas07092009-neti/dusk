/* ── Widget : Tic-tac-toe (vs IA simple) ─────────────────── */

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(b) {
  for (const [a,c,d] of WINS) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}

function aiMove(board) {
  // Minimax simple
  function score(b, depth, isMax) {
    const w = checkWinner(b);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (w === 'draw') return 0;
    const empties = b.map((v, i) => v ? null : i).filter(v => v !== null);
    if (isMax) {
      let best = -Infinity;
      for (const i of empties) {
        b[i] = 'O';
        best = Math.max(best, score(b, depth + 1, false));
        b[i] = null;
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of empties) {
        b[i] = 'X';
        best = Math.min(best, score(b, depth + 1, true));
        b[i] = null;
      }
      return best;
    }
  }

  const empties = board.map((v, i) => v ? null : i).filter(v => v !== null);
  let best = -Infinity, move = empties[0];
  for (const i of empties) {
    board[i] = 'O';
    const s = score(board, 0, false);
    board[i] = null;
    if (s > best) { best = s; move = i; }
  }
  return move;
}

export const tictactoeWidget = {
  id:    'tictactoe',
  label: 'Tic-tac-toe',
  size:  'small',

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:1.5rem">⭕❌</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);letter-spacing:0.08em">Tic-tac-toe vs IA</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Ouvrir pour jouer</div>
      </div>`;
  },

  renderDetail(container) {
    let board, gameOver, xWins, oWins;

    function init() {
      board    = Array(9).fill(null);
      gameOver = false;
      render();
    }

    function render() {
      const w = checkWinner(board);
      const status = w
        ? (w === 'draw' ? 'Égalité !' : w === 'X' ? '🎉 Tu gagnes !' : '😈 IA gagne !')
        : 'Ton tour (✕)';

      container.innerHTML = `
        <div style="max-width:340px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-4)">
          <div class="ttt-status">${status}</div>
          <div class="ttt-board" style="gap:var(--space-2)">
            ${board.map((cell, i) => `
              <div class="ttt-cell ${cell === 'X' ? 'x-cell' : cell === 'O' ? 'o-cell' : ''}"
                data-i="${i}" style="min-height:90px;font-size:var(--text-2xl)">
                ${cell === 'X' ? '✕' : cell === 'O' ? '○' : ''}
              </div>`).join('')}
          </div>
          <button class="quote-btn" id="ttt-reset" style="margin:0 auto">↻ Rejouer</button>
        </div>`;

      container.querySelector('#ttt-reset').addEventListener('click', init);

      if (!w) {
        container.querySelectorAll('.ttt-cell').forEach(el => {
          const i = parseInt(el.dataset.i);
          if (!board[i]) {
            el.addEventListener('click', () => {
              board[i] = 'X';
              if (!checkWinner(board) && board.some(c => !c)) {
                setTimeout(() => { board[aiMove(board)] = 'O'; render(); }, 250);
              }
              render();
            });
          }
        });
      }
    }

    init();
  },
};
