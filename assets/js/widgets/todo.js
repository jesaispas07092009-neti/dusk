/* ── Widget : To-Do ──────────────────────────────────────── */
import { state } from '../state.js';
import { deleteTodo, saveTodos } from '../user-data.js';
import { persistMutation } from '../lib/persist.js';
import { renderGrid } from '../grid.js';
import { esc } from '../utils/escape.js';

function getTodos() {
  return state.get('user.todos') || [];
}

function setTodos(next) {
  state.set('user.todos', next.map(todo => ({ ...todo })));
}

function nextPosition(todos) {
  return todos.length ? Math.max(...todos.map(t => Number(t.position) || 0)) + 1 : 0;
}

function cloneTodos(todos) {
  return todos.map(todo => ({ ...todo }));
}

function renderCompact(container) {
  const todos = getTodos();
  const done = todos.filter(t => t.done).length;

  container.innerHTML = `
    <div class="wc-fill" style="gap:var(--space-2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-1)">
        <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">${done}/${todos.length} terminées</span>
      </div>
      ${todos.length === 0
        ? `<div class="widget-placeholder" style="flex:1"><p>Aucune tâche</p></div>`
        : `<ul class="todo-list">
            ${todos.slice(0, 5).map(t => `
              <li class="todo-item ${t.done ? 'done' : ''}">
                <div class="todo-check">${t.done ? '✓' : ''}</div>
                <span class="todo-text">${esc(t.text)}</span>
              </li>`).join('')}
           </ul>
           ${todos.length > 5 ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">+${todos.length - 5} autres…</div>` : ''}`
      }
    </div>`;
}

export const todoWidget = {
  id: 'todo',
  label: 'To-Do',
  size: 'medium',

  render(container) {
    renderCompact(container);
  },

  renderDetail(container) {
    let todos = cloneTodos(getTodos());
    let syncMessage = '';
    let syncError = false;
    let statusTimer = null;

    function setStatus(message = '', error = false, autoClear = false) {
      syncMessage = message;
      syncError = error;

      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }

      if (autoClear && message) {
        statusTimer = setTimeout(() => {
          if (!container.isConnected) return;
          syncMessage = '';
          syncError = false;
          redraw();
        }, 2000);
      }
    }

    function redraw() {
      const done = todos.filter(t => t.done).length;

      container.innerHTML = `
        <div style="max-width:560px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
            <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)">${done} / ${todos.length} terminées</span>
            ${done > 0 ? `<button class="quote-btn" id="todo-clear">Supprimer les terminées</button>` : ''}
          </div>

          <div id="todo-sync-status" style="margin-bottom:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:${syncError ? '#c84a4a' : 'var(--color-text-faint)'}">
            ${esc(syncMessage)}
          </div>

          <ul class="todo-list" id="todo-list">
            ${todos.length === 0
              ? `<li style="text-align:center;padding:var(--space-8);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Aucune tâche — ajoutez-en une !</li>`
              : todos.map((t, i) => `
                <li class="todo-item ${t.done ? 'done' : ''}" data-i="${i}">
                  <div class="todo-check" data-check="${i}">${t.done ? '✓' : ''}</div>
                  <span class="todo-text">${esc(t.text)}</span>
                  <span class="todo-delete" data-del="${i}">×</span>
                </li>`).join('')
            }
          </ul>
          <div class="todo-input-row" style="margin-top:var(--space-4)">
            <input class="todo-input" id="todo-input" type="text" placeholder="Nouvelle tâche…" maxlength="120"/>
            <button class="todo-add-btn" id="todo-add">Ajouter</button>
          </div>
        </div>`;

      const input = container.querySelector('#todo-input');
      const addBtn = container.querySelector('#todo-add');
      const clearBtn = container.querySelector('#todo-clear');

      async function persistTodos(nextTodos, action, successMessage = 'Sauvegardé') {
        const previous = cloneTodos(todos);
        todos = cloneTodos(nextTodos);
        setTodos(todos);
        setStatus('Sauvegarde…');
        renderGrid();
        redraw();

        try {
          await persistMutation({
            action,
            rollback: () => {
              todos = cloneTodos(previous);
              setTodos(previous);
            },
            errorMessage: 'Impossible de sauvegarder les tâches.',
          });
          setStatus(successMessage, false, true);
          renderGrid();
          redraw();
        } catch (err) {
          console.error('Todo save failed:', err);
          setStatus('Erreur de sauvegarde', true);
          renderGrid();
          redraw();
        }
      }

      async function addTodo() {
        const text = input.value.trim();
        if (!text) return;
        const next = [
          { id: crypto.randomUUID?.() || String(Date.now()), text, done: false, position: nextPosition(todos) },
          ...todos,
        ];
        input.value = '';
        await persistTodos(next, () => saveTodos(state.get('user.id'), next), 'Tâche ajoutée');
      }

      addBtn?.addEventListener('click', addTodo);
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

      container.querySelectorAll('[data-check]').forEach(el => {
        el.addEventListener('click', async () => {
          const idx = Number(el.dataset.check);
          const next = cloneTodos(todos);
          next[idx] = { ...next[idx], done: !next[idx].done };
          await persistTodos(next, () => saveTodos(state.get('user.id'), next), 'Tâche mise à jour');
        });
      });

      container.querySelectorAll('[data-del]').forEach(el => {
        el.addEventListener('click', async () => {
          const idx = Number(el.dataset.del);
          const removed = todos[idx];
          const next = todos.filter((_, i) => i !== idx);
          await persistTodos(next, () => deleteTodo(state.get('user.id'), removed.id), 'Tâche supprimée');
        });
      });

      clearBtn?.addEventListener('click', async () => {
        const removedTodos = todos.filter(t => t.done);
        const next = todos.filter(t => !t.done);
        await persistTodos(
          next,
          async () => {
            for (const todo of removedTodos) {
              await deleteTodo(state.get('user.id'), todo.id);
            }
          },
          'Tâches supprimées'
        );
      });
    }

    redraw();
  },
};
