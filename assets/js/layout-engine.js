/* ═══════════════════════════════════════════════════════════
   DUSK — layout-engine.js
   Drag & drop des widgets avec snap à la grille CSS.
   Persist des positions en Supabase / localStorage.

   Architecture :
   - PointerEvents API pour le drag (pas de librairie externe)
   - Lecture de la grille CSS réelle via getBoundingClientRect()
   - Snap sur la cellule la plus proche (pas de positions fixes)
   - Animations via motion-engine (snapToPosition, morphWidget)
   - Persistance dans widget_prefs.position (ordre = position dans la grille)

   Mode d'emploi :
     import { initLayoutEngine, destroyLayoutEngine } from './layout-engine.js';
     initLayoutEngine(gridEl);   // active le drag
     destroyLayoutEngine();      // désactive proprement
═══════════════════════════════════════════════════════════ */
import { state }                                 from './state.js';
import { saveWidgetPrefs }                       from './user-data.js';
import { morphWidget, snapToPosition, EASING }  from './motion-engine.js';

/* ── Config ─────────────────────────────────────────────── */
const DRAG_THRESHOLD_PX = 6;   // px de mouvement avant de déclencher le drag
const DRAG_SCALE        = 1.03; // grossissement du widget pendant le drag
const GHOST_OPACITY     = 0.35; // opacité de la "trace" fantôme

/* ── État interne du moteur ──────────────────────────────── */
let _gridEl      = null;
let _cleanupFns  = [];
let _isDragging  = false;

/* ══════════════════════════════════════════════════════════
   INIT / DESTROY
══════════════════════════════════════════════════════════ */

/**
 * Active le drag & drop sur la grille.
 * @param {HTMLElement} gridEl  l'élément #dusk-grid
 */
export function initLayoutEngine(gridEl) {
  if (!gridEl) return;
  _gridEl = gridEl;
  destroyLayoutEngine(); // reset propre si déjà actif

  const onPointerDown = (e) => handlePointerDown(e);
  gridEl.addEventListener('pointerdown', onPointerDown);
  _cleanupFns.push(() => gridEl.removeEventListener('pointerdown', onPointerDown));
}

/**
 * Désactive le drag & drop et nettoie tous les listeners.
 */
export function destroyLayoutEngine() {
  _cleanupFns.forEach(fn => fn());
  _cleanupFns = [];
  _isDragging = false;
}

/* ══════════════════════════════════════════════════════════
   POINTER HANDLERS
══════════════════════════════════════════════════════════ */

function handlePointerDown(e) {
  // Ne drag que sur le header du widget (poignée implicite)
  // ou sur le widget lui-même si pas de texte sélectionné
  const widget = e.target.closest('.widget');
  if (!widget) return;

  // Ne pas intercepter les clics sur les boutons interactifs
  if (e.target.closest('button, a, input, select, textarea, [data-no-drag]')) return;

  // Seulement bouton gauche / touch
  if (e.button !== 0 && e.pointerType === 'mouse') return;

  const startX = e.clientX;
  const startY = e.clientY;
  let dragStarted = false;
  let dragCtx = null;

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;

    if (!dragStarted) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      dragStarted = true;
      dragCtx = startDrag(widget, ev);
      if (!dragCtx) { cleanup(); return; }
    }

    if (dragCtx) updateDrag(dragCtx, ev);
  }

  function onUp(ev) {
    cleanup();
    if (dragStarted && dragCtx) {
      endDrag(dragCtx, ev);
    }
  }

  function onCancel() {
    cleanup();
    if (dragStarted && dragCtx) cancelDrag(dragCtx);
  }

  function cleanup() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup',   onUp);
    window.removeEventListener('pointercancel', onCancel);
  }

  window.addEventListener('pointermove',   onMove,    { passive: true });
  window.addEventListener('pointerup',     onUp);
  window.addEventListener('pointercancel', onCancel);

  // Capture pour éviter que le pointer quitte la fenêtre
  widget.setPointerCapture(e.pointerId);
}

/* ══════════════════════════════════════════════════════════
   DRAG LIFECYCLE
══════════════════════════════════════════════════════════ */

/**
 * Démarre le drag : crée le ghost, prépare le contexte.
 * @returns {object|null} dragCtx
 */
function startDrag(widget, e) {
  if (_isDragging) return null;
  _isDragging = true;

  const gridRect   = _gridEl.getBoundingClientRect();
  const widgetRect = widget.getBoundingClientRect();

  // Position du curseur relative au coin du widget
  const offsetX = e.clientX - widgetRect.left;
  const offsetY = e.clientY - widgetRect.top;

  // Snapshot pour FLIP éventuel
  const snapBefore = morphWidget.before(widget);

  // Créer le ghost (trace dans la grille pendant le drag)
  const ghost = document.createElement('div');
  ghost.className = 'widget-drag-ghost';
  ghost.style.cssText = `
    grid-column: ${getComputedStyle(widget).gridColumn};
    grid-row:    ${getComputedStyle(widget).gridRow};
  `;
  _gridEl.insertBefore(ghost, widget);

  // Passer le widget en mode "dragging"
  widget.classList.add('is-dragging');
  widget.style.cssText = `
    position: fixed;
    left:   ${widgetRect.left}px;
    top:    ${widgetRect.top}px;
    width:  ${widgetRect.width}px;
    height: ${widgetRect.height}px;
    z-index: 200;
    pointer-events: none;
    transition: transform 80ms ease, box-shadow 80ms ease;
    transform: scale(${DRAG_SCALE});
    box-shadow: var(--shadow-drag, 0 24px 60px rgba(0,0,0,0.5));
  `;

  // Collecter les positions initiales des autres widgets pour le re-order
  const siblings = [..._gridEl.querySelectorAll('.widget:not(.is-dragging)')];
  const siblingData = siblings.map(el => ({
    el,
    rect: el.getBoundingClientRect(),
    id:   el.dataset.widgetId,
  }));

  return {
    widget,
    ghost,
    widgetRect,
    gridRect,
    offsetX,
    offsetY,
    snapBefore,
    siblingData,
    currentX: widgetRect.left,
    currentY: widgetRect.top,
    targetIndex: null,
  };
}

/**
 * Met à jour la position du widget draggé + le ghost.
 */
function updateDrag(ctx, e) {
  const x = e.clientX - ctx.offsetX;
  const y = e.clientY - ctx.offsetY;

  ctx.currentX = x;
  ctx.currentY = y;

  // Déplacer le widget (fixed positioning)
  ctx.widget.style.left = `${x}px`;
  ctx.widget.style.top  = `${y}px`;

  // Trouver le widget cible le plus proche par le centre
  const dragCenterX = x + ctx.widgetRect.width  / 2;
  const dragCenterY = y + ctx.widgetRect.height / 2;

  let closest     = null;
  let closestDist = Infinity;

  ctx.siblingData.forEach(({ el, rect }, index) => {
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dist = Math.hypot(dragCenterX - cx, dragCenterY - cy);
    if (dist < closestDist) {
      closestDist = dist;
      closest     = { el, index };
    }
  });

  if (!closest) return;

  const newTargetIndex = closest.index;
  if (newTargetIndex === ctx.targetIndex) return;
  ctx.targetIndex = newTargetIndex;

  // Déplacer le ghost à la position cible
  const targetEl    = ctx.siblingData[newTargetIndex].el;
  const targetStyle = getComputedStyle(targetEl);

  // Animer le déplacement du ghost via FLIP
  const ghostBefore = morphWidget.before(ctx.ghost);
  ctx.ghost.style.gridColumn = targetStyle.gridColumn;
  ctx.ghost.style.gridRow    = targetStyle.gridRow;
  morphWidget.after(ctx.ghost, ghostBefore, { baseDuration: 180 });
}

/**
 * Termine le drag : repositionne le widget, persiste l'ordre.
 */
function endDrag(ctx, e) {
  _isDragging = false;

  const { widget, ghost, siblingData, targetIndex } = ctx;

  // Retirer les styles de drag
  widget.classList.remove('is-dragging');
  widget.style.cssText = '';

  // Replacer dans la grille au bon endroit
  if (targetIndex !== null && siblingData[targetIndex]) {
    const targetEl = siblingData[targetIndex].el;
    _gridEl.insertBefore(widget, targetEl);
  }

  ghost.remove();

  // Animation FLIP : le widget revient de sa position fixed à sa position grille
  const newRect = widget.getBoundingClientRect();
  const dx = ctx.currentX - newRect.left;
  const dy = ctx.currentY - newRect.top;

  snapToPosition(widget, { x: dx, y: dy });

  // Persister le nouvel ordre
  persistNewOrder();
}

/**
 * Annule le drag : remet le widget à sa position d'origine.
 */
function cancelDrag(ctx) {
  _isDragging = false;

  ctx.widget.classList.remove('is-dragging');
  ctx.widget.style.cssText = '';
  ctx.ghost.remove();
}

/* ══════════════════════════════════════════════════════════
   PERSISTANCE
══════════════════════════════════════════════════════════ */

/**
 * Lit l'ordre actuel des widgets dans le DOM et le persiste.
 */
function persistNewOrder() {
  const userId = state.get('user.id');
  if (!userId) return;

  const currentPrefs = state.get('user.widgetPrefs') || [];
  const domOrder = [..._gridEl.querySelectorAll('.widget[data-widget-id]')]
    .map(el => el.dataset.widgetId);

  // Reconstruire les prefs en respectant le nouvel ordre DOM
  const byId = new Map(currentPrefs.map(p => [p.widget_id, p]));

  const newPrefs = domOrder.map((widgetId, position) => {
    const existing = byId.get(widgetId);
    return existing
      ? { ...existing, position }
      : { user_id: userId, widget_id: widgetId, enabled: true, position };
  });

  // Widgets qui n'apparaissent pas dans le DOM (désactivés) → conserver à la fin
  const inDom = new Set(domOrder);
  currentPrefs
    .filter(p => !inDom.has(p.widget_id))
    .forEach((p, i) => newPrefs.push({ ...p, position: domOrder.length + i }));

  // Update du state
  state.set('user.widgetPrefs', newPrefs);

  // Persist (fire & forget, on ne bloque pas l'UI)
  saveWidgetPrefs(userId, newPrefs).catch(err => {
    console.warn('[Dusk] Layout persist error:', err);
  });
}

/* ══════════════════════════════════════════════════════════
   UTILITAIRES PUBLICS
══════════════════════════════════════════════════════════ */

/**
 * Active ou désactive le mode drag (ex: toggle dans les settings).
 * @param {boolean} enabled
 */
export function setDragEnabled(enabled) {
  if (!_gridEl) return;
  if (enabled) {
    initLayoutEngine(_gridEl);
    _gridEl.classList.add('drag-enabled');
  } else {
    destroyLayoutEngine();
    _gridEl.classList.remove('drag-enabled');
  }
}

/**
 * Retourne true si le drag est actif.
 */
export function isDragEnabled() {
  return _cleanupFns.length > 0;
}
