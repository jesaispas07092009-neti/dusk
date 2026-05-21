/* ═══════════════════════════════════════════════════════════
   DUSK — grid.js
   Construit la grille depuis le registre et applique les prefs user.
   - motion-engine.js pour le stagger d'apparition
   - layout-engine.js pour le drag & drop
═══════════════════════════════════════════════════════════ */
import { state }                                 from './state.js';
import { openModal }                             from './modal.js';
import { getWidgetRegistry, WIDGET_REGISTRY_ALL } from './registry.js';
import { esc }                                   from './utils/escape.js';
import { staggerIn }                             from './motion-engine.js';
import { initLayoutEngine, destroyLayoutEngine } from './layout-engine.js';

let gridBound   = false;
let dragEnabled = false;

/* ── Tri des widgets selon les prefs user ────────────────── */
function getVisibleRegistry() {
  const registry = getWidgetRegistry();
  const prefs    = state.get('user.widgetPrefs') || [];

  if (!prefs.length) return registry;

  const byId = new Map(prefs.map(p => [p.widget_id, p]));
  return registry
    .map(widget => ({ widget, pref: byId.get(widget.id) }))
    .filter(({ pref }) => !pref || pref.enabled !== false)
    .sort((a, b) => {
      const ap = a.pref?.position ?? 999;
      const bp = b.pref?.position ?? 999;
      return ap - bp;
    })
    .map(item => item.widget);
}

function cleanupWidget(widget) {
  if (typeof widget._compactCleanup === 'function') {
    try { widget._compactCleanup(); } catch {}
  }
  widget._compactCleanup = null;
}

/* ── Construction du DOM d'un widget ─────────────────────── */
function buildWidgetEl(widget) {
  const expandable = typeof widget.renderDetail === 'function' || widget.expandable !== false;

  const article = document.createElement('article');
  article.className = [
    'widget',
    `widget--${widget.size || 'small'}`,
    expandable ? 'widget--expandable' : '',
  ].filter(Boolean).join(' ');
  article.dataset.widgetId = widget.id;
  if (expandable) article.setAttribute('tabindex', '0');
  article.setAttribute('aria-label', `Widget ${esc(widget.label)}`);
  article.setAttribute('aria-grabbed', 'false');

  article.innerHTML = `
    <div class="widget-inner">
      <header class="widget-header">
        <span class="widget-drag-handle" aria-hidden="true" title="Déplacer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9"  cy="5"  r="1"/><circle cx="15" cy="5"  r="1"/>
            <circle cx="9"  cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
            <circle cx="9"  cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </span>
        <span class="widget-label">${esc(widget.label)}</span>
        ${expandable ? `
          <button class="widget-expand-btn" aria-label="Ouvrir en plein écran" data-no-drag>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>` : ''}
      </header>
      <div class="widget-body"></div>
    </div>`;

  return article;
}

/* ── Listeners de la grille (click + clavier) ────────────── */
function initWidgetClicks() {
  const grid = document.getElementById('dusk-grid');
  if (!grid || gridBound) return;
  gridBound = true;

  grid.addEventListener('click', e => {
    // Ne pas ouvrir la modale si on vient juste de finir un drag
    if (grid.classList.contains('was-dragging')) {
      grid.classList.remove('was-dragging');
      return;
    }
    const widget = e.target.closest('.widget--expandable');
    if (!widget) return;
    const id  = widget.dataset.widgetId;
    const def = WIDGET_REGISTRY_ALL.find(w => w.id === id);
    if (!def || typeof def.renderDetail !== 'function') return;
    openModal(id, def.label, def.renderDetail.bind(def));
  });

  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const widget = e.target.closest('.widget--expandable');
    if (!widget) return;
    e.preventDefault();
    widget.click();
  });
}

/* ── Rendu principal ─────────────────────────────────────── */
export function renderGrid() {
  const grid = document.getElementById('dusk-grid');
  if (!grid) return;

  const widgets = getVisibleRegistry();

  // Cleanup moteur de layout avant de reconstruire
  destroyLayoutEngine();

  WIDGET_REGISTRY_ALL.forEach(cleanupWidget);
  grid.innerHTML = '';

  // Construire les éléments
  const elements = widgets.map(widget => {
    const el = buildWidgetEl(widget);
    grid.appendChild(el);
    return { el, widget };
  });

  // Stagger d'apparition calibré sur --motion-speed du thème
  const staggered = staggerIn(elements.map(e => e.el));

  // Render + visibilité de chaque widget
  elements.forEach(({ el, widget }, index) => {
    const { delay } = staggered[index];

    el.classList.add('is-visible');

    const bodyEl = el.querySelector('.widget-body');
    if (bodyEl && typeof widget.render === 'function') {
      try {
        widget._compactCleanup = widget.render(bodyEl, 'compact') || null;
      } catch (err) {
        console.warn(`[Dusk] Widget "${widget.id}" render error:`, err);
        bodyEl.innerHTML = `<div class="wc-center" style="opacity:.4;font-family:var(--font-mono);
          font-size:var(--text-xs);color:var(--color-text-faint)">— erreur —</div>`;
      }
    }

    setTimeout(() => {
      const visible = [...(state.get('widgets.visible') || []), widget.id].filter(Boolean);
      state.set('widgets.visible', [...new Set(visible)]);
    }, delay + 300);
  });

  initWidgetClicks();

  // (Re)activer le drag si c'était activé avant le re-render
  if (dragEnabled) {
    initLayoutEngine(grid);
  }
}

/* ── Activation / désactivation du drag depuis settings ──── */

/**
 * Bascule le mode drag & drop.
 * @param {boolean} enabled
 */
export function setGridDrag(enabled) {
  const grid = document.getElementById('dusk-grid');
  dragEnabled = enabled;

  if (enabled) {
    grid?.classList.add('drag-enabled');
    if (grid) initLayoutEngine(grid);
  } else {
    grid?.classList.remove('drag-enabled');
    destroyLayoutEngine();
  }
}

export function isGridDragEnabled() {
  return dragEnabled;
}

export function initGrid() {
  renderGrid();
}
