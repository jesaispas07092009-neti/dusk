/* ── Widget : Projets ────────────────────────────────────── */
import { state }                        from '../state.js';
import { getDefaultProjects, saveProjects } from '../user-data.js';

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
  state.set('user.projects', next);
}

function statusColor(s) {
  return STATUS_COLORS[s] || '#c8813c';
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
            <div class="project-dot" style="background:${p.color || statusColor(p.status)}"></div>
            <div>
              <div class="project-name">${p.name}</div>
              <div class="project-desc">${p.description || p.desc || ''}</div>
            </div>
            <span class="project-status" style="background:${statusColor(p.status)}20;color:${statusColor(p.status)};border:1px solid ${statusColor(p.status)}40">${p.status}</span>
          </div>`).join('')}
      </div>`;
  },

  renderDetail(container) {
    let projects = [...getProjects()];

    function persist() {
      setProjects(projects);
      saveProjects(state.get('user.id'), projects).catch(() => {});
    }

    function redraw() {
      persist();
      container.innerHTML = `
        <div style="max-width:640px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
            <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">Mes projets</div>
            <button class="todo-add-btn" id="proj-new">+ Nouveau</button>
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
                  ${STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('')}
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
                <div class="project-dot" style="background:${p.color || statusColor(p.status)};width:10px;height:10px;margin-top:5px"></div>
                <div style="flex:1">
                  <div class="project-name" style="font-size:var(--text-base)">${p.name}</div>
                  <div class="project-desc" style="margin-top:var(--space-1)">${p.description || p.desc || ''}</div>
                </div>
                <select class="proj-status-select" data-proj-status="${i}"
                  style="background:${statusColor(p.status)}15;color:${statusColor(p.status)};border:1px solid ${statusColor(p.status)}40;border-radius:999px;padding:4px 10px;font-family:var(--font-mono);font-size:var(--text-xs);cursor:pointer">
                  ${STATUS_LIST.map(s => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <span data-del-proj="${i}" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);cursor:pointer;margin-left:var(--space-2);padding:4px 8px">×</span>
              </div>`).join('')}
          </div>
        </div>`;

      container.querySelector('#proj-new').addEventListener('click', () => {
        const form = container.querySelector('#proj-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });

      container.querySelector('#proj-cancel').addEventListener('click', () => {
        container.querySelector('#proj-form').style.display = 'none';
      });

      container.querySelector('#proj-save').addEventListener('click', () => {
        const name = container.querySelector('#proj-name').value.trim();
        if (!name) return;
        const status = container.querySelector('#proj-status').value;
        const desc = container.querySelector('#proj-desc').value.trim();
        projects = [...projects, { id: crypto.randomUUID?.() || String(Date.now()), name, description: desc, status, color: statusColor(status), position: projects.length }];
        redraw();
      });

      container.querySelectorAll('[data-proj-status]').forEach(sel => {
        sel.addEventListener('change', e => {
          e.stopPropagation();
          const idx = Number(sel.dataset.projStatus);
          projects[idx] = { ...projects[idx], status: sel.value, color: statusColor(sel.value) };
          redraw();
        });
      });

      container.querySelectorAll('[data-del-proj]').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          projects.splice(Number(el.dataset.delProj), 1);
          redraw();
        });
      });
    }

    redraw();
  },
};
