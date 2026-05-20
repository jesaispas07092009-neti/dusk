/* ── Widget : Projets ────────────────────────────────────── */
import { state } from '../state.js';
import { deleteProject, getDefaultProjects, saveProjects } from '../user-data.js';
import { persistMutation } from '../lib/persist.js';
import { renderGrid } from '../grid.js';
import { esc } from '../utils/escape.js';

const STATUS_COLORS = {
  'actif':    '#c8813c',
  'en pause': '#4a7ab5',
  'concept':  '#8b5cf6',
  'terminé':  '#4a8f7a',
  'idée':     '#7a7067',
};

const STATUS_LIST = ['actif', 'en pause', 'concept', 'terminé', 'idée'];

function getProjects() {
  return state.get('user.projects') || getDefaultProjects();
}

function setProjects(next) {
  state.set('user.projects', next.map(project => ({ ...project })));
}

function cloneProjects(projects) {
  return projects.map(project => ({ ...project }));
}

function statusColor(s) {
  return STATUS_COLORS[s] || '#c8813c';
}

function safeColor(value, fallback) {
  const s = String(value ?? '').trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  return fallback;
}

export const projectsWidget = {
  id:    'projects',
  label: 'Projets',
  size:  'medium',

  render(container) {
    const projects = getProjects();
    container.innerHTML = `
      <div class="wc-fill" style="gap:var(--space-2)">
        ${projects.slice(0, 3).map(p => `
          <div class="project-item">
            <div class="project-dot" style="background:${safeColor(p.color, statusColor(p.status))}"></div>
            <div>
              <div class="project-name">${esc(p.name)}</div>
              <div class="project-desc">${esc(p.description || p.desc || '')}</div>
            </div>
            <span class="project-status" style="background:${statusColor(p.status)}20;color:${statusColor(p.status)};border:1px solid ${statusColor(p.status)}40">${esc(p.status)}</span>
          </div>`).join('')}
      </div>`;
  },

  renderDetail(container) {
    let projects = cloneProjects(getProjects());
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
      container.innerHTML = `
        <div style="max-width:640px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
            <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">Mes projets</div>
            <button class="todo-add-btn" id="proj-new">+ Nouveau</button>
          </div>

          <div id="proj-sync-status" style="margin-bottom:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:${syncError ? '#c84a4a' : 'var(--color-text-faint)'}">
            ${esc(syncMessage)}
          </div>

          <div id="proj-form" style="display:none;margin-bottom:var(--space-5);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-surface-2);border:1px solid var(--color-border)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)">
              <label style="display:grid;gap:var(--space-1)">
                <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Nom</span>
                <input id="proj-name" class="todo-input" type="text" maxlength="60" placeholder="Nom du projet" style="width:100%"/>
              </label>
              <label style="display:grid;gap:var(--space-1)">
                <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Statut</span>
                <select id="proj-status" style="background:var(--color-surface-3);border:1px solid var(--color-border);border-radius:12px;padding:0.6rem 0.8rem;color:var(--color-text);font:inherit;width:100%">
                  ${STATUS_LIST.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
                </select>
              </label>
            </div>
            <label style="display:grid;gap:var(--space-1);margin-bottom:var(--space-3)">
              <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">Description</span>
              <input id="proj-desc" class="todo-input" type="text" maxlength="120" placeholder="Description courte" style="width:100%"/>
            </label>
            <div style="display:flex;gap:var(--space-2);justify-content:flex-end">
              <button class="quote-btn" id="proj-cancel">Annuler</button>
              <button class="todo-add-btn" id="proj-save">Ajouter</button>
            </div>
          </div>

          <div class="projects-list">
            ${projects.map((p, i) => `
              <div class="project-item" data-proj="${i}">
                <div class="project-dot" style="background:${safeColor(p.color, statusColor(p.status))};width:10px;height:10px;margin-top:5px"></div>
                <div style="flex:1">
                  <div class="project-name" style="font-size:var(--text-base)">${esc(p.name)}</div>
                  <div class="project-desc" style="margin-top:var(--space-1)">${esc(p.description || p.desc || '')}</div>
                </div>
                <select class="proj-status-select" data-proj-status="${i}"
                  style="background:${statusColor(p.status)}15;color:${statusColor(p.status)};border:1px solid ${statusColor(p.status)}40;border-radius:999px;padding:4px 10px;font-family:var(--font-mono);font-size:var(--text-xs);cursor:pointer">
                  ${STATUS_LIST.map(s => `<option value="${esc(s)}" ${s === p.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select>
                <span data-del-proj="${i}" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);cursor:pointer;margin-left:var(--space-2);padding:4px 8px">×</span>
              </div>`).join('')}
          </div>
        </div>`;

      const status = container.querySelector('#proj-sync-status');
      const form = container.querySelector('#proj-form');

      container.querySelector('#proj-new').addEventListener('click', () => {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });

      container.querySelector('#proj-cancel').addEventListener('click', () => {
        form.style.display = 'none';
      });

      async function persistProjects(nextProjects, action, successMessage = 'Sauvegardé') {
        const previous = cloneProjects(projects);
        projects = cloneProjects(nextProjects);
        setProjects(projects);
        setStatus('Sauvegarde…');
        renderGrid();
        redraw();

        try {
          await persistMutation({
            action,
            rollback: () => {
              projects = cloneProjects(previous);
              setProjects(previous);
            },
            errorMessage: 'Impossible de sauvegarder les projets.',
          });
          setStatus(successMessage, false, true);
          renderGrid();
          redraw();
        } catch (err) {
          console.error('Projects save failed:', err);
          setStatus('Erreur de sauvegarde', true);
          renderGrid();
          redraw();
        }
      }

      container.querySelector('#proj-save').addEventListener('click', async () => {
        const name = container.querySelector('#proj-name').value.trim();
        if (!name) return;
        const statusValue = container.querySelector('#proj-status').value;
        const desc = container.querySelector('#proj-desc').value.trim();
        const next = [
          ...projects,
          {
            id: crypto.randomUUID?.() || String(Date.now()),
            name,
            description: desc,
            status: statusValue,
            color: statusColor(statusValue),
            position: projects.length,
          },
        ];
        form.style.display = 'none';
        await persistProjects(next, () => saveProjects(state.get('user.id'), next), 'Projet ajouté');
      });

      container.querySelectorAll('[data-proj-status]').forEach(sel => {
        sel.addEventListener('change', async e => {
          e.stopPropagation();
          const idx = Number(sel.dataset.projStatus);
          const next = cloneProjects(projects);
          next[idx] = { ...next[idx], status: sel.value, color: statusColor(sel.value) };
          await persistProjects(next, () => saveProjects(state.get('user.id'), next), 'Statut mis à jour');
        });
      });

      container.querySelectorAll('[data-del-proj]').forEach(el => {
        el.addEventListener('click', async e => {
          e.stopPropagation();
          const idx = Number(el.dataset.delProj);
          const removed = projects[idx];
          const next = projects.filter((_, i) => i !== idx);
          await persistProjects(next, () => deleteProject(state.get('user.id'), removed.id), 'Projet supprimé');
        });
      });
    }

    redraw();
  },
};
