/* ── Widget : Timer / Chronomètre ────────────────────────── */

function fmt(ms) {
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtMs(ms) { return `${String(Math.floor(ms / 100) % 10)}`; }

export const timerWidget = {
  id:    'timer',
  label: 'Timer',
  size:  'small',

  render(container) {
    let elapsed = 0, running = false, start = 0, iv = null;

    function tick() {
      elapsed = Date.now() - start;
      container.querySelector('#tw-display').textContent = fmt(elapsed);
    }

    function toggle() {
      if (running) {
        clearInterval(iv); running = false;
        container.querySelector('#tw-btn').textContent = 'START';
        container.querySelector('#tw-btn').classList.remove('active');
      } else {
        start = Date.now() - elapsed; running = true;
        iv = setInterval(tick, 100);
        container.querySelector('#tw-btn').textContent = 'PAUSE';
        container.querySelector('#tw-btn').classList.add('active');
      }
    }

    function reset() {
      clearInterval(iv); running = false; elapsed = 0;
      container.querySelector('#tw-display').textContent = '00:00';
      container.querySelector('#tw-btn').textContent = 'START';
      container.querySelector('#tw-btn').classList.remove('active');
    }

    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-3)">
        <div class="timer-display" id="tw-display">00:00</div>
        <div class="timer-controls">
          <button class="timer-btn" id="tw-btn">START</button>
          <button class="timer-btn" id="tw-reset">RESET</button>
        </div>
      </div>`;

    container.querySelector('#tw-btn').addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    container.querySelector('#tw-reset').addEventListener('click', (e) => { e.stopPropagation(); reset(); });

    return () => clearInterval(iv);
  },

  renderDetail(container) {
    let mode    = 'chrono'; // chrono | timer
    let elapsed = 0, remaining = 0, timerTarget = 5 * 60 * 1000;
    let running = false, start = 0, iv = null;
    const PRESETS = [
      { label: '5 min',  ms: 5 * 60000 },
      { label: '10 min', ms: 10 * 60000 },
      { label: '25 min', ms: 25 * 60000 },
      { label: '1 h',    ms: 60 * 60000 },
    ];

    function tick() {
      if (mode === 'chrono') {
        elapsed = Date.now() - start;
        updateDisplay(elapsed);
      } else {
        remaining = timerTarget - (Date.now() - start);
        if (remaining <= 0) {
          remaining = 0;
          clearInterval(iv); running = false;
          updateDisplay(0);
          container.querySelector('#td-status').textContent = '⏰ Terminé !';
          container.querySelector('#td-status').style.color = 'var(--color-amber)';
          return;
        }
        updateDisplay(remaining);
      }
    }

    function updateDisplay(ms) {
      const el = container.querySelector('#td-display');
      if (el) el.textContent = fmt(ms);
    }

    function toggle() {
      if (running) {
        clearInterval(iv); running = false;
        if (mode === 'chrono') elapsed = Date.now() - start;
        else remaining = timerTarget - (Date.now() - start);
      } else {
        if (mode === 'chrono') start = Date.now() - elapsed;
        else { start = Date.now(); timerTarget = remaining > 0 ? remaining : timerTarget; }
        iv = setInterval(tick, 100);
        running = true;
      }
      render();
    }

    function reset() {
      clearInterval(iv); running = false; elapsed = 0; remaining = timerTarget;
      render();
    }

    function setPreset(ms) {
      clearInterval(iv); running = false; remaining = ms; timerTarget = ms; elapsed = 0;
      render();
    }

    function render() {
      const displayVal = mode === 'chrono' ? elapsed : remaining || timerTarget;
      container.innerHTML = `
        <div style="text-align:center;padding:var(--space-6) 0">
          <!-- Mode switcher -->
          <div style="display:inline-flex;border:1px solid var(--color-border);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:var(--space-6)">
            <button class="timer-btn ${mode==='chrono'?'active':''}" id="td-chrono" style="flex:1;border:none;border-radius:0">Chrono</button>
            <button class="timer-btn ${mode==='timer'?'active':''}" id="td-timer" style="flex:1;border:none;border-radius:0">Timer</button>
          </div>

          <div style="font-family:var(--font-display);font-size:clamp(3rem,10vw,5rem);color:var(--color-text);letter-spacing:-0.03em;line-height:1" id="td-display">
            ${fmt(displayVal)}
          </div>

          <div id="td-status" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-2);height:1.5em"></div>

          <div class="timer-controls" style="justify-content:center;margin-top:var(--space-6)">
            <button class="timer-btn ${running?'active':''}" id="td-toggle" style="min-width:100px">${running ? 'Pause' : 'Start'}</button>
            <button class="timer-btn" id="td-reset">Reset</button>
          </div>

          ${mode === 'timer' ? `
            <div class="timer-presets" style="justify-content:center;margin-top:var(--space-4)">
              ${PRESETS.map(p => `<button class="timer-preset" data-ms="${p.ms}">${p.label}</button>`).join('')}
            </div>` : ''}
        </div>`;

      container.querySelector('#td-toggle').addEventListener('click', toggle);
      container.querySelector('#td-reset').addEventListener('click', reset);
      container.querySelector('#td-chrono').addEventListener('click', () => { if (mode !== 'chrono') { clearInterval(iv); running = false; elapsed = 0; mode = 'chrono'; render(); } });
      container.querySelector('#td-timer').addEventListener('click',  () => { if (mode !== 'timer')  { clearInterval(iv); running = false; remaining = timerTarget; mode = 'timer'; render(); } });

      container.querySelectorAll('.timer-preset').forEach(btn => {
        btn.addEventListener('click', () => setPreset(parseInt(btn.dataset.ms)));
      });

      if (running) { clearInterval(iv); iv = setInterval(tick, 100); }
    }

    render();
    return () => clearInterval(iv);
  },
};
