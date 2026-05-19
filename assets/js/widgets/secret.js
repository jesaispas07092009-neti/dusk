/* ── Widget : Journal des secrets ────────────────────────── */

const KEY_ENTRIES = 'dusk-secret-entries';
const KEY_PIN     = 'dusk-secret-pin';
const DEFAULT_PIN = '1234';

function getEntries() {
  try { return JSON.parse(localStorage.getItem(KEY_ENTRIES)) || []; } catch { return []; }
}
function saveEntries(e) { try { localStorage.setItem(KEY_ENTRIES, JSON.stringify(e)); } catch {} }
function getPin() { return localStorage.getItem(KEY_PIN) || DEFAULT_PIN; }

export const secretWidget = {
  id:    'secret',
  label: 'Journal',
  size:  'small',

  render(container) {
    const count = getEntries().length;
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div class="secret-lock-icon">🔒</div>
        <div style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--color-text)">Journal secret</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">${count} entrée${count !== 1 ? 's' : ''}</div>
      </div>`;
  },

  renderDetail(container) {
    let unlocked = false;
    let pin      = '';

    function renderLock() {
      container.innerHTML = `
        <div class="secret-locked" style="min-height:400px">
          <div class="secret-lock-icon">🔒</div>
          <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">Journal secret</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:-var(--space-1)">Code PIN par défaut : 1234</div>
          <div class="secret-pin-dots" id="pin-dots">
            ${[0,1,2,3].map(() => `<div class="secret-pin-dot"></div>`).join('')}
          </div>
          <div class="secret-numpad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n => `
              <button class="secret-num-btn" data-n="${n}" ${n===''?'style="visibility:hidden"':''}>${n}</button>`
            ).join('')}
          </div>
          <div id="pin-error" style="font-family:var(--font-mono);font-size:var(--text-xs);color:#c84a4a;height:1.5em"></div>
        </div>`;

      function updateDots() {
        container.querySelectorAll('.secret-pin-dot').forEach((dot, i) => {
          dot.classList.toggle('filled', i < pin.length);
        });
      }

      container.querySelectorAll('.secret-num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const n = btn.dataset.n;
          if (n === '⌫') { pin = pin.slice(0, -1); }
          else if (n !== '' && pin.length < 4) { pin += n; }
          updateDots();

          if (pin.length === 4) {
            if (pin === getPin()) {
              unlocked = true;
              renderJournal();
            } else {
              container.querySelector('#pin-error').textContent = 'Code incorrect';
              setTimeout(() => { pin = ''; updateDots(); container.querySelector('#pin-error').textContent = ''; }, 800);
            }
          }
        });
      });
    }

    function renderJournal() {
      let entries = getEntries();

      function render() {
        entries = getEntries();
        container.innerHTML = `
          <div style="max-width:560px;margin:0 auto">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
              <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">📖 Mes secrets</div>
              <button class="quote-btn" id="sec-lock">🔒 Verrouiller</button>
            </div>

            <textarea class="secret-textarea" id="sec-text" placeholder="Écris quelque chose…"></textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:var(--space-2)">
              <button class="todo-add-btn" id="sec-save">Sauvegarder</button>
            </div>

            <div style="margin-top:var(--space-6)">
              <div class="detail-heading">${entries.length} entrée${entries.length !== 1 ? 's' : ''}</div>
              <div class="secret-entries">
                ${entries.length === 0
                  ? `<div style="text-align:center;padding:var(--space-6);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Aucune entrée pour l'instant.</div>`
                  : entries.slice().reverse().map((e, i) => `
                    <div class="secret-entry">
                      <div class="secret-entry-date">${new Date(e.date).toLocaleString('fr-FR')}</div>
                      <div class="secret-entry-text">${e.text}</div>
                      <div style="text-align:right;margin-top:var(--space-2)">
                        <span data-del="${entries.length - 1 - i}" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);cursor:pointer">Supprimer</span>
                      </div>
                    </div>`).join('')
                }
              </div>
            </div>
          </div>`;

        container.querySelector('#sec-lock').addEventListener('click', () => {
          unlocked = false; pin = ''; renderLock();
        });

        container.querySelector('#sec-save').addEventListener('click', () => {
          const text = container.querySelector('#sec-text').value.trim();
          if (!text) return;
          const arr = getEntries();
          arr.push({ text, date: Date.now() });
          saveEntries(arr);
          render();
        });

        container.querySelectorAll('[data-del]').forEach(el => {
          el.addEventListener('click', () => {
            const arr = getEntries();
            arr.splice(parseInt(el.dataset.del), 1);
            saveEntries(arr);
            render();
          });
        });
      }

      render();
    }

    renderLock();
  },
};
