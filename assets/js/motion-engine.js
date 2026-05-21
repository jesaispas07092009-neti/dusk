/* ═══════════════════════════════════════════════════════════
   DUSK — motion-engine.js
   Moteur d'animations centralisé, calibré sur --motion-speed.

   Responsabilités :
   - Lire --motion-speed depuis :root (défini par le thème actif)
   - Exposer animate(), staggerIn(), hover(), morphWidget() (FLIP)
   - Toutes les durées sont divisées par le speed du thème actif
   - Respecte prefers-reduced-motion (accessibilité)
   - Aucune dépendance externe — Web Animations API native
═══════════════════════════════════════════════════════════ */

/* ── Lecture du multiplicateur de vitesse du thème actif ─── */

/**
 * Lit --motion-speed depuis :root (injecté par themes.css).
 * Fallback à 1 si la variable n'existe pas.
 * @returns {number}
 */
function getSpeed() {
  if (prefersReducedMotion()) return 10; // durées ultra-courtes, mouvement quasi nul
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-speed')
    .trim();
  const parsed = parseFloat(raw);
  return isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Calcule une durée ajustée selon --motion-speed.
 * speed > 1 → animations plus rapides (durée réduite)
 * speed < 1 → animations plus lentes (durée augmentée)
 * @param {number} baseMs  durée de base en ms
 * @returns {number}       durée ajustée en ms
 */
function dur(baseMs) {
  return Math.round(baseMs / getSpeed());
}

/* ── Easings (miroir de main.css pour usage JS) ─────────── */
export const EASING = {
  dusk:   'cubic-bezier(0.25, 0.1, 0.25, 1)',
  emerge: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // léger overshoot
  soft:   'cubic-bezier(0.4, 0, 0.2, 1)',
};

/* ── Durées de base (en ms) ─────────────────────────────── */
const BASE = {
  fast:        150,
  base:        250,
  slow:        400,
  modal:       500,
  drag:        200,  // snap to grid
  stagger:      65,  // délai entre chaque widget au stagger
  staggerBase: 120,  // délai initial avant le 1er widget
};

/* ══════════════════════════════════════════════════════════
   prefersReducedMotion()
   Utilitaire pour respecter les préférences d'accessibilité.
   Déclaré avant getSpeed() qui s'en sert.
══════════════════════════════════════════════════════════ */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ══════════════════════════════════════════════════════════
   animate()
   Wrapper autour de Web Animations API, motion-aware.
   Retourne l'Animation pour que l'appelant puisse .cancel().
══════════════════════════════════════════════════════════ */

/**
 * @param {Element}    el
 * @param {Keyframe[]} keyframes
 * @param {KeyframeAnimationOptions & { baseDuration?: number }} options
 * @returns {Animation}
 */
export function animate(el, keyframes, options = {}) {
  const {
    baseDuration = BASE.base,
    easing = EASING.emerge,
    fill = 'both',
    delay = 0,
    ...rest
  } = options;

  return el.animate(keyframes, {
    duration: dur(baseDuration),
    easing,
    fill,
    delay,
    ...rest,
  });
}

/* ══════════════════════════════════════════════════════════
   staggerIn()
   Anime un tableau d'éléments en cascade, avec délai adapté
   au --motion-speed du thème actif.
══════════════════════════════════════════════════════════ */

/**
 * @param {Element[]} elements
 * @param {object}   options
 * @param {number}   [options.baseDelay]
 * @param {number}   [options.staggerMs]
 * @param {number}   [options.baseDuration]
 * @param {string}   [options.easing]
 * @returns {{ el: Element, delay: number, duration: number }[]}
 */
export function staggerIn(elements, options = {}) {
  const {
    baseDelay    = BASE.staggerBase,
    staggerMs    = BASE.stagger,
    baseDuration = BASE.slow,
    easing       = EASING.emerge,
  } = options;

  const speed = getSpeed();
  const adjustedStagger = Math.round(staggerMs    / speed);
  const adjustedBase    = Math.round(baseDelay    / speed);
  const adjustedDur     = Math.round(baseDuration / speed);

  return elements.map((el, index) => {
    const delay = adjustedBase + index * adjustedStagger;
    el.style.animationDelay    = `${delay}ms`;
    el.style.animationDuration = `${adjustedDur}ms`;
    return { el, delay, duration: adjustedDur };
  });
}

/* ══════════════════════════════════════════════════════════
   hover()
   Attache les animations de survol (lift + glow) sur un élément.
   Retourne une fonction cleanup.
══════════════════════════════════════════════════════════ */

/**
 * @param {Element} el
 * @param {object}  [options]
 * @param {number}  [options.liftPx]
 * @param {boolean} [options.glow]
 * @returns {() => void}
 */
export function hover(el, options = {}) {
  const { liftPx = 2, glow = true } = options;

  let enterAnim = null;
  let leaveAnim = null;

  function onEnter() {
    if (leaveAnim) { leaveAnim.cancel(); leaveAnim = null; }
    enterAnim = el.animate([
      { transform: 'translateY(0)',             boxShadow: 'var(--shadow-widget)' },
      { transform: `translateY(-${liftPx}px)`, boxShadow: glow ? 'var(--shadow-hover)' : 'var(--shadow-widget)' },
    ], { duration: dur(BASE.base), easing: EASING.emerge, fill: 'forwards' });
  }

  function onLeave() {
    if (enterAnim) { enterAnim.cancel(); enterAnim = null; }
    leaveAnim = el.animate([
      { transform: `translateY(-${liftPx}px)` },
      { transform: 'translateY(0)' },
    ], { duration: dur(BASE.base), easing: EASING.dusk, fill: 'forwards' });
  }

  function onPress() {
    el.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(0) scale(0.995)' },
    ], { duration: dur(BASE.fast), easing: EASING.dusk, fill: 'forwards' });
  }

  el.addEventListener('mouseenter', onEnter);
  el.addEventListener('mouseleave', onLeave);
  el.addEventListener('mousedown',  onPress);

  return function cleanup() {
    el.removeEventListener('mouseenter', onEnter);
    el.removeEventListener('mouseleave', onLeave);
    el.removeEventListener('mousedown',  onPress);
    if (enterAnim) enterAnim.cancel();
    if (leaveAnim) leaveAnim.cancel();
  };
}

/* ══════════════════════════════════════════════════════════
   morphWidget() — technique FLIP
   Transition fluide quand un widget change de taille/position.

   Usage :
     const snap = morphWidget.before(el);
     // ... appliquer le changement DOM ...
     morphWidget.after(el, snap);
══════════════════════════════════════════════════════════ */
export const morphWidget = {
  before(el) {
    return { rect: el.getBoundingClientRect() };
  },

  after(el, snapshot, options = {}) {
    const { baseDuration = BASE.slow, easing = EASING.emerge } = options;

    const newRect = el.getBoundingClientRect();
    const oldRect = snapshot.rect;

    const dx = oldRect.left   - newRect.left;
    const dy = oldRect.top    - newRect.top;
    const sx = oldRect.width  / newRect.width;
    const sy = oldRect.height / newRect.height;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 &&
        Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;

    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
      { transform: 'translate(0, 0) scale(1)',                         transformOrigin: 'top left' },
    ], { duration: dur(baseDuration), easing, fill: 'none' });
  },
};

/* ══════════════════════════════════════════════════════════
   snapToPosition()
   Animation de snap utilisée par layout-engine.js quand un
   widget rejoint sa cellule de grille après un drag.
══════════════════════════════════════════════════════════ */

/**
 * @param {Element} el         widget draggé
 * @param {object}  fromPos    { x, y } position actuelle (transform)
 * @returns {Promise<void>}
 */
export function snapToPosition(el, fromPos = { x: 0, y: 0 }) {
  if (prefersReducedMotion()) {
    el.style.transform = '';
    return Promise.resolve();
  }
  const anim = el.animate([
    { transform: `translate(${fromPos.x}px, ${fromPos.y}px)` },
    { transform: 'translate(0, 0)' },
  ], {
    duration: dur(BASE.drag),
    easing:   EASING.spring,
    fill:     'forwards',
  });
  return anim.finished.then(() => { el.style.transform = ''; });
}

/* ══════════════════════════════════════════════════════════
   fadeIn() / fadeOut()
══════════════════════════════════════════════════════════ */

export function fadeIn(el, options = {}) {
  const { baseDuration = BASE.base, easing = EASING.emerge, dy = 8, delay = 0 } = options;
  return el.animate([
    { opacity: 0, transform: `translateY(${dy}px)` },
    { opacity: 1, transform: 'translateY(0)' },
  ], {
    duration: dur(baseDuration),
    easing,
    fill: 'both',
    delay: Math.round(delay / getSpeed()),
  });
}

export function fadeOut(el, options = {}) {
  const { baseDuration = BASE.fast, easing = EASING.dusk } = options;
  return el.animate([
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(4px)' },
  ], { duration: dur(baseDuration), easing, fill: 'both' });
}

/* ══════════════════════════════════════════════════════════
   animateModalOpen() / animateModalClose()
   Animations modale, motion-aware.
══════════════════════════════════════════════════════════ */

export function animateModalOpen(backdropEl, containerEl, isMobile = false) {
  backdropEl.animate([
    { opacity: 0 }, { opacity: 1 },
  ], { duration: dur(BASE.modal), easing: EASING.dusk, fill: 'forwards' });

  const fromTransform = isMobile
    ? 'translateY(100%)'
    : 'translateY(20px) scale(0.97)';

  containerEl.animate([
    { opacity: 0, transform: fromTransform },
    { opacity: 1, transform: isMobile ? 'translateY(0)' : 'translateY(0) scale(1)' },
  ], { duration: dur(BASE.modal), easing: EASING.emerge, fill: 'forwards' });
}

export function animateModalClose(backdropEl, containerEl, isMobile = false) {
  const toTransform = isMobile
    ? 'translateY(60px)'
    : 'translateY(12px) scale(0.98)';

  const d = dur(BASE.modal);

  backdropEl.animate([
    { opacity: 1 }, { opacity: 0 },
  ], { duration: d, easing: EASING.dusk, fill: 'forwards' });

  const anim = containerEl.animate([
    { opacity: 1, transform: isMobile ? 'translateY(0)' : 'translateY(0) scale(1)' },
    { opacity: 0, transform: toTransform },
  ], { duration: d, easing: EASING.dusk, fill: 'forwards' });

  return anim.finished;
}

/* ══════════════════════════════════════════════════════════
   notifyPulse()
══════════════════════════════════════════════════════════ */
export function notifyPulse(el) {
  el.animate([
    { transform: 'scale(1)',     opacity: 1 },
    { transform: 'scale(1.18)', opacity: 0.85 },
    { transform: 'scale(1)',     opacity: 1 },
  ], { duration: dur(BASE.slow), easing: EASING.spring, fill: 'none' });
}

/* ══════════════════════════════════════════════════════════
   Export groupé (pour import * as motionEngine)
══════════════════════════════════════════════════════════ */
export default {
  getSpeed,
  dur,
  animate,
  staggerIn,
  hover,
  morphWidget,
  snapToPosition,
  fadeIn,
  fadeOut,
  animateModalOpen,
  animateModalClose,
  notifyPulse,
  prefersReducedMotion,
  EASING,
};
                            
