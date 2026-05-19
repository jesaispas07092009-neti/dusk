/* ── Widget : 2048 ───────────────────────────────────────── */

const SIZE = 4;

function emptyGrid() { return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); }

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function slideRow(row) {
  const nums = row.filter(x => x);
  const merged = [];
  let i = 0, score = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      score += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i++]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, score };
}

function move(grid, dir) {
  let newGrid = emptyGrid(), totalScore = 0, changed = false;

  const getRow = (r) => {
    if (dir === 'left')  return grid[r];
    if (dir === 'right') return [...grid[r]].reverse();
    if (dir === 'up')    return grid.map(row => row[r]);
    if (dir === 'down')  return [...grid.map(row => row[r])].reverse();
  };

  const setRow = (r, row) => {
    if (dir === 'right') row = [...row].reverse();
    if (dir === 'down')  row = [...row].reverse();
    for (let i = 0; i < SIZE; i++) {
      if (dir === 'left' || dir === 'right') newGrid[r][i] = row[i];
      else newGrid[i][r] = row[i];
    }
  };

  for (let r = 0; r < SIZE; r++) {
    const original = getRow(r);
    const { row, score } = slideRow(original);
    setRow(r, row);
    totalScore += score;
    if (row.join() !== original.join()) changed = true;
  }

  return { grid: newGrid, score: totalScore, changed };
}

function hasMovesLeft(grid) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r+1][c]) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c+1]) return true;
    }
  return false;
}

const COLORS = {
  0:    ['#201d1a', '#3d3830'],
  2:    ['#2a2622', '#7a7067'],
  4:    ['#2e261e', '#9a8060'],
  8:    ['#3d2a12', '#c8813c'],
  16:   ['#4a2a0a', '#e09b52'],
  32:   ['#4a1a0a', '#e06040'],
  64:   ['#5a0a0a', '#e04020'],
  128:  ['#3a2a60', '#9b7ae0'],
  256:  ['#2a3a60', '#7a9ae0'],
  512:  ['#1a4a40', '#4ac8a0'],
  1024: ['#1a4a20', '#4ab860'],
  2048: ['#4a3a00', '#e0c040'],
};

function tileStyle(val) {
  const [bg, fg] = COLORS[val] || COLORS[2048];
  return `background:${bg};color:${fg};`;
}

export const game2048Widget = {
  id:    '2048',
  label: '2048',
  size:  'small',

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:1.5rem">🧩</div>
        <div style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--color-text)">2048</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Ouvrir pour jouer</div>
      </div>`;
  },

  renderDetail(container) {
    let grid, score, best, over;

    try { best = parseInt(localStorage.getItem('dusk-2048-best')) || 0; } catch { best = 0; }

    function init() {
      grid  = emptyGrid();
      score = 0; over = false;
      addRandom(grid); addRandom(grid);
      render();
    }

    function doMove(dir) {
      if (over) return;
      const result = move(grid, dir);
      if (!result.changed) return;
      grid   = result.grid;
      score += result.score;
      if (score > best) { best = score; try { localStorage.setItem('dusk-2048-best', best); } catch {} }
      addRandom(grid);
      if (!hasMovesLeft(grid)) over = true;
      render();
    }

    function render() {
      container.innerHTML = `
        <div style="max-width:360px;margin:0 auto;user-select:none">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
            <div style="display:flex;gap:var(--space-3)">
              <div class="weather-stat" style="text-align:center;min-width:70px">
                <div class="weather-stat-label">Score</div>
                <div class="weather-stat-value">${score}</div>
              </div>
              <div class="weather-stat" style="text-align:center;min-width:70px">
                <div class="weather-stat-label">Meilleur</div>
                <div class="weather-stat-value">${best}</div>
              </div>
            </div>
            <button class="quote-btn" id="g2048-new">Nouveau</button>
          </div>

          <div id="g2048-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:var(--color-surface-3);border-radius:var(--radius-md);padding:6px;touch-action:none">
            ${grid.flat().map(v => `
              <div style="
                display:flex;align-items:center;justify-content:center;
                aspect-ratio:1;border-radius:var(--radius-sm);
                font-family:var(--font-display);
                font-size:${v >= 1024 ? 'var(--text-sm)' : v >= 100 ? 'var(--text-base)' : 'var(--text-xl)'};
                ${tileStyle(v)}
                transition:all 0.1s;
              ">${v || ''}</div>`).join('')}
          </div>

          ${over ? `<div style="text-align:center;margin-top:var(--space-4);font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-amber)">Game Over !</div>` : ''}
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;margin-top:var(--space-3)">
            Flèches / ZQSD · Swipe sur mobile
          </div>
        </div>`;

      container.querySelector('#g2048-new').addEventListener('click', init);

      // Keyboard
      function onKey(e) {
        const map = { ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',
                      q:'left',d:'right',z:'up',s:'down',Q:'left',D:'right',Z:'up',S:'down' };
        if (map[e.key]) { e.preventDefault(); doMove(map[e.key]); }
      }
      document.addEventListener('keydown', onKey);

      // Touch swipe
      const gridEl = container.querySelector('#g2048-grid');
      let ts = null;
      gridEl.addEventListener('touchstart', e => { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; e.preventDefault(); }, { passive: false });
      gridEl.addEventListener('touchend', e => {
        if (!ts) return;
        const dx = e.changedTouches[0].clientX - ts.x;
        const dy = e.changedTouches[0].clientY - ts.y;
        ts = null;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        const dir = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'right' : 'left')
          : (dy > 0 ? 'down'  : 'up');
        doMove(dir);
        e.preventDefault();
      }, { passive: false });

      return () => document.removeEventListener('keydown', onKey);
    }

    init();
  },
};
