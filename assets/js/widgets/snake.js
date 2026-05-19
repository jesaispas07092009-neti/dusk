/* ── Widget : Snake ──────────────────────────────────────── */

const CELL   = 16;
const COLS   = 20;
const ROWS   = 20;
const W      = CELL * COLS;
const H      = CELL * ROWS;

export const snakeWidget = {
  id:    'snake',
  label: 'Snake',
  size:  'medium',

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:2rem">🐍</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);letter-spacing:0.08em">Snake</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Ouvrir pour jouer</div>
      </div>`;
  },

  renderDetail(container) {
    container.innerHTML = `
      <div class="snake-container">
        <div class="snake-score">Score : <span id="snake-score">0</span></div>
        <canvas id="snake-canvas" width="${W}" height="${H}" style="max-width:min(${W}px,100%)"></canvas>
        <div class="snake-hint" id="snake-hint">Appuie sur Espace ou touche le canvas pour démarrer · ZQSD ou flèches</div>
        <div class="snake-controls-mobile">
          <div></div>
          <button class="snake-dpad-btn" data-dir="UP"    style="grid-column:2;grid-row:1">▲</button>
          <div></div>
          <button class="snake-dpad-btn" data-dir="LEFT"  style="grid-column:1;grid-row:2">◄</button>
          <button class="snake-dpad-btn" data-dir="DOWN"  style="grid-column:2;grid-row:2">▼</button>
          <button class="snake-dpad-btn" data-dir="RIGHT" style="grid-column:3;grid-row:2">►</button>
        </div>
      </div>`;

    const canvas  = container.querySelector('#snake-canvas');
    const ctx     = canvas.getContext('2d');
    const scoreEl = container.querySelector('#snake-score');
    const hintEl  = container.querySelector('#snake-hint');

    // Scale canvas for high-DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `min(${W}px, 100%)`;
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);

    let snake, dir, nextDir, food, score, gameLoop, running, speed;

    function rnd(n) { return Math.floor(Math.random() * n); }

    function spawnFood() {
      let pos;
      do { pos = { x: rnd(COLS), y: rnd(ROWS) }; }
      while (snake.some(s => s.x === pos.x && s.y === pos.y));
      return pos;
    }

    function init() {
      snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir     = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      food    = spawnFood();
      score   = 0;
      speed   = 120;
      running = false;
      scoreEl.textContent = 0;
      hintEl.textContent  = 'Espace ou tap pour démarrer · ZQSD ou flèches';
      draw();
    }

    function draw() {
      // Background
      ctx.fillStyle = '#181614';
      ctx.fillRect(0, 0, W, H);

      // Grid subtle
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
      }

      // Food
      ctx.fillStyle = '#c8813c';
      ctx.shadowColor = '#c8813c';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snake.forEach((seg, i) => {
        const alpha = 1 - (i / snake.length) * 0.5;
        ctx.fillStyle = i === 0 ? '#e09b52' : `rgba(200,129,60,${alpha})`;
        const pad = i === 0 ? 1 : 2;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 3);
        ctx.fill();
      });
    }

    function step() {
      dir = { ...nextDir };
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Walls
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
      // Self
      if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        food  = spawnFood();
        speed = Math.max(60, speed - 2);
      } else {
        snake.pop();
      }

      draw();
      gameLoop = setTimeout(step, speed);
    }

    function gameOver() {
      running = false;
      clearTimeout(gameLoop);
      ctx.fillStyle = 'rgba(8,7,6,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8e0d6';
      ctx.font = `${CELL * 1.2}px 'DM Serif Display', Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', W / 2, H / 2 - 10);
      ctx.font = `${CELL * 0.7}px 'DM Mono', monospace`;
      ctx.fillStyle = '#7a7067';
      ctx.fillText(`Score : ${score}`, W / 2, H / 2 + 20);
      hintEl.textContent = 'Espace ou tap pour recommencer';
    }

    function start() {
      if (running) return;
      running = true;
      hintEl.textContent = 'ZQSD ou flèches pour diriger';
      step();
    }

    function restart() { clearTimeout(gameLoop); init(); }

    // Controls
    const DIRMAP = {
      ArrowUp:    { x:  0, y: -1 }, z: { x:  0, y: -1 }, Z: { x:  0, y: -1 },
      ArrowDown:  { x:  0, y:  1 }, s: { x:  0, y:  1 }, S: { x:  0, y:  1 },
      ArrowLeft:  { x: -1, y:  0 }, q: { x: -1, y:  0 }, Q: { x: -1, y:  0 },
      ArrowRight: { x:  1, y:  0 }, d: { x:  1, y:  0 }, D: { x:  1, y:  0 },
    };
    const DPAD = { UP: { x:0, y:-1 }, DOWN: { x:0, y:1 }, LEFT: { x:-1, y:0 }, RIGHT: { x:1, y:0 } };

    function onKey(e) {
      if (e.key === ' ') { e.preventDefault(); running ? restart() : start(); return; }
      const d = DIRMAP[e.key];
      if (!d) return;
      e.preventDefault();
      if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
    }

    document.addEventListener('keydown', onKey);
    canvas.addEventListener('click', () => running ? null : (Object.keys(DIRMAP).length, start()));

    container.querySelectorAll('.snake-dpad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = DPAD[btn.dataset.dir];
        if (!d) return;
        if (!running) start();
        if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
      });
    });

    // Touch swipe on canvas
    let touchStart = null;
    canvas.addEventListener('touchstart', e => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', e => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { running ? null : start(); return; }
      const d = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? { x:1,y:0 } : { x:-1,y:0 })
        : (dy > 0 ? { x:0,y:1 } : { x:0,y:-1 });
      if (!running) start();
      if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
      touchStart = null;
      e.preventDefault();
    }, { passive: false });

    init();

    // Cleanup when modal closes
    return () => {
      clearTimeout(gameLoop);
      document.removeEventListener('keydown', onKey);
    };
  },
};
