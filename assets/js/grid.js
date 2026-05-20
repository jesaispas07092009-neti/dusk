/* ═══════════════════════════════════════════════════════════
   DUSK — grid.js
   Construit la grille depuis le registre et applique les prefs user
═══════════════════════════════════════════════════════════ */
import { state } from './state.js';
import { openModal } from './modal.js';
import { getWidgetRegistry, WIDGET_REGISTRY_ALL } from './registry.js';
import { esc } from './utils/escape.js';

const STAGGER_MS = 65;
let gridBound = false;

function getVisibleRegistry() {
  const registry = getWidgetRegistry();
  const prefs = state.get('user.widgetPrefs') || [];

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

  article.innerHTML = `
    <div class="widget-inner">
      <header class="widget-header">
        <span class="widget-label">${esc(widget.label)}</span>
        ${expandable ? `
          <button class="widget-expand-btn" aria-label="Ouvrir en plein écran">
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

function initWidgetClicks() {
  const grid = document.getElementById('dusk-grid');
  if (!grid || gridBound) return;
  gridBound = true;

  grid.addEventListener('click', e => {
    const widget = e.target.closest('.widget--expandable');
    if (!widget) return;
    const id = widget.dataset.widgetId;
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

export function renderGrid() {
  const grid = document.getElementById('dusk-grid');
  if (!grid) return;

  const widgets = getVisibleRegistry();

  WIDGET_REGISTRY_ALL.forEach(cleanupWidget);
  grid.innerHTML = '';

  widgets.forEach((widget, index) => {
    const el = buildWidgetEl(widget);
    grid.appendChild(el);

    const delay = 120 + index * STAGGER_MS;
    el.style.animationDelay = `${delay}ms`;
    el.classList.add('is-visible');

    const bodyEl = el.querySelector('.widget-body');
    if (bodyEl && typeof widget.render === 'function') {
      try {
        widget._compactCleanup = widget.render(bodyEl, 'compact') || null;
      } catch (err) {
        console.warn(`[Dusk] Widget "${widget.id}" render error:`, err);
        bodyEl.innerHTML = `<div class="wc-center" style="opacity:.4;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">— erreur —</div>`;
      }
    }

    setTimeout(() => {
      const visible = [...(state.get('widgets.visible') || []), widget.id].filter(Boolean);
      state.set('widgets.visible', [...new Set(visible)]);
    }, delay + 300);
  });

  initWidgetClicks();
}

export function initGrid() {
  renderGrid();
}
