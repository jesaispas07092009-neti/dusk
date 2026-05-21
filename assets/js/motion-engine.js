/* ═══════════════════════════════════════════════════════════
   DUSK — motion-engine.js
   Moteur d'animations centralisé, calibré sur --motion-speed.

   Responsabilités :
   - Lire --motion-speed depuis :root (défini par le thème actif)
   - Exposer animate(), staggerIn(), hover(), morphWidget() (FLIP)
   - Toutes les durées sont multipliées par le speed du thème actif
   - Aucune dépendance externe — Web Animations API native
═══════════════════════════════════════════════════════════ */

/* ── Lecture du multiplicateur de vitesse du thème actif ─── */

/**
 * Lit --motion-speed depuis :root (injecté par themes.css).
 * Fallback à 1 si la variable n'existe pas.
 * @returns {number}
 */
function getSpeed() {
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
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // léger overshoot
  soft:   'cubic-bezier(0.4, 0, 0.2, 1)',
};

/* ── Durées de base (en ms) ─────────────────────────────── */
const BASE = {
  fast:   150,
  base:   250,
  slow:   400,
  modal:  500,
  stagger: 65,   // délai entre chaque widget au stagger
  staggerBase: 120, // délai initial avant le 1er widget
};

/* ══════════════════════════════════════════════════════════
   animate()
   Wrapper autour de Web Animations API, motion-aware.
   Retourne l'Animation pour que l'appelant puisse .cancel() si besoin.
══════════════════════════════════════════════════════════ */

/**
 * @param {Element}  el
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
 * @param {number}   [options.baseDelay]    délai initial avant le 1er élément (ms)
 * @param {number}   [options.staggerMs]    délai entre chaque élément (ms)
 * @param {number}   [options.baseDuration] durée de l'animation de chaque élément
 * @param {string}   [options.easing]
 * @returns {Animation[]}
 */
export function staggerIn(elements, options = {}) {
  const {
    baseDelay    = BASE.staggerBase,
    staggerMs    = BASE.stagger,
    baseDuration = BASE.slow,
    easing       = EASING.emerge,
  } = options;

  const speed = getSpeed();
  // Le stagger lui-même est aussi ralenti/accéléré par le thème
  const adjustedStagger = Math.round(staggerMs / speed);
  const adjustedBase    = Math.round(baseDelay  / speed);
  const adjustedDur     = Math.round(baseDuration / speed);

  return elements.map((el, index) => {
    const delay = adjustedBase + index * adjustedStagger;

    // Applique le delay comme animationDelay CSS pour que le widget
    // reste invisible jusqu'au bon moment (compatibilité avec widget-appear)
    el.style.animationDelay    = `${delay}ms`;
    el.style.animationDuration = `${adjustedDur}ms`;

    return { el, delay, duration: adjustedDur };
  });
}

/* ══════════════════════════════════════════════════════════
   hover()
   Attache les animations de survol (lift + glow) sur un élément.
   Retourne une fonction de cleanup pour detacher les listeners.
══════════════════════════════════════════════════════════ */

/**
 * @param {Element} el
 * @param {object}  options
 * @param {number}  [options.liftPx]     déplacement vertical au hover (px)
 * @param {boolean} [options.glow]       activer le glow (box-shadow hover)
 * @returns {() => void}  cleanup
 */
export function hover(el, options = {}) {
  const { liftPx = 2, glow = true } = options;

  let enterAnim = null;
  let leaveAnim = null;

  function onEnter() {
    if (leaveAnim) { leaveAnim.cancel(); leaveAnim = null; }
    enterAnim = el.animate([
      { transform: 'translateY(0)',        boxShadow: 'var(--shadow-widget)' },
      { transform: `translateY(-${liftPx}px)`, boxShadow: glow ? 'var(--shadow-hover)' : 'var(--shadow-widget)' },
    ], {
      duration: dur(BASE.base),
      easing:   EASING.emerge,
      fill:     'forwards',
    });
  }

  function onLeave() {
    if (enterAnim) { enterAnim.cancel(); enterAnim = null; }
    leaveAnim = el.animate([
      { transform: `translateY(-${liftPx}px)` },
      { transform: 'translateY(0)' },
    ], {
      duration: dur(BASE.base),
      easing:   EASING.dusk,
      fill:     'forwards',
    });
  }

  function onPress() {
    el.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(0) scale(0.995)' },
    ], {
      duration: dur(BASE.fast),
      easing:   EASING.dusk,
      fill:     'forwards',
    });
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
   Transition fluide quand un widget change de taille ou de contenu.

   Usage :
     const done = morphWidget.before(el);
     // ... appliquer le changement ...
     morphWidget.after(el, done);
══════════════════════════════════════════════════════════ */

export const morphWidget = {
  /**
   * Capture la position et taille AVANT le changement.
   * @param {Element} el
   * @returns {{ rect: DOMRect }}
   */
  before(el) {
    return { rect: el.getBoundingClientRect() };
  },

  /**
   * Anime depuis l'ancienne position vers la nouvelle (FLIP).
   * À appeler APRÈS avoir appliqué le changement de DOM/classes.
   * @param {Element} el
   * @param {{ rect: DOMRect }} snapshot  résultat de before()
   * @param {object} [options]
   * @param {number} [options.baseDuration]
   * @param {string} [options.easing]
   */
  after(el, snapshot, options = {}) {
    const { baseDuration = BASE.slow, easing = EASING.emerge } = options;

    const newRect  = el.getBoundingClientRect();
    const oldRect  = snapshot.rect;

    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top  - newRect.top;
    const sx = oldRect.width  / newRect.width;
    const sy = oldRect.height / newRect.height;

    // Pas de mouvement réel → rien à animer
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;

    el.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
      { transform: 'translate(0, 0) scale(1)',                         transformOrigin: 'top left' },
    ], {
      duration: dur(baseDuration),
      easing,
      fill: 'none',
    });
  },
};

/* ══════════════════════════════════════════════════════════
   fadeIn() / fadeOut()
   Utilitaires simples pour apparition/disparition d'un élément.
══════════════════════════════════════════════════════════ */

/**
 * Fait apparaître un élément (opacity 0 → 1, translateY).
 * @param {Element} el
 * @param {object}  [options]
 * @returns {Animation}
 */
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

/**
 * Fait disparaître un élément (opacity 1 → 0).
 * @param {Element} el
 * @param {object}  [options]
 * @returns {Animation}
 */
export function fadeOut(el, options = {}) {
  const { baseDuration = BASE.fast, easing = EASING.dusk } = options;
  return el.animate([
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(4px)' },
  ], {
    duration: dur(baseDuration),
    easing,
    fill: 'both',
  });
}

/* ══════════════════════════════════════════════════════════
   openModal() / closeModal()
   Animations d'entrée/sortie pour la modale, motion-aware.
══════════════════════════════════════════════════════════ */

/**
 * Animation d'ouverture de la modale.
 * @param {Element} backdropEl
 * @param {Element} containerEl
 * @param {boolean} isMobile
 */
export function animateModalOpen(backdropEl, containerEl, isMobile = false) {
  backdropEl.animate([
    { opacity: 0 },
    { opacity: 1 },
  ], {
    duration: dur(BASE.modal),
    easing:   EASING.dusk,
    fill:     'forwards',
  });

  const fromTransform = isMobile
    ? 'translateY(100%)'
    : 'translateY(20px) scale(0.97)';

  containerEl.animate([
    { opacity: 0, transform: fromTransform },
    { opacity: 1, transform: isMobile ? 'translateY(0)' : 'translateY(0) scale(1)' },
  ], {
    duration: dur(BASE.modal),
    easing:   EASING.emerge,
    fill:     'forwards',
  });
}

/**
 * Animation de fermeture de la modale.
 * @param {Element} backdropEl
 * @param {Element} containerEl
 * @param {boolean} isMobile
 * @returns {Promise<void>}  résout quand l'animation est terminée
 */
export function animateModalClose(backdropEl, containerEl, isMobile = false) {
  const toTransform = isMobile
    ? 'translateY(60px)'
    : 'translateY(12px) scale(0.98)';

  const d = dur(BASE.modal);

  backdropEl.animate([
    { opacity: 1 },
    { opacity: 0 },
  ], { duration: d, easing: EASING.dusk, fill: 'forwards' });

  const anim = containerEl.animate([
    { opacity: 1, transform: isMobile ? 'translateY(0)' : 'translateY(0) scale(1)' },
    { opacity: 0, transform: toTransform },
  ], { duration: d, easing: EASING.dusk, fill: 'forwards' });

  return anim.finished;
}

/* ══════════════════════════════════════════════════════════
   notifyPulse()
   Pulse d'attention sur un élément (badge, dot, bouton).
══════════════════════════════════════════════════════════ */

/**
 * @param {Element} el
 */
export function notifyPulse(el) {
  el.animate([
    { transform: 'scale(1)',    opacity: 1 },
    { transform: 'scale(1.18)', opacity: 0.85 },
    { transform: 'scale(1)',    opacity: 1 },
  ], {
    duration: dur(BASE.slow),
    easing:   EASING.spring,
    fill:     'none',
  });
}

/* ══════════════════════════════════════════════════════════
   prefersReducedMotion()
   Utilitaire pour respecter les préférences d'accessibilité.
══════════════════════════════════════════════════════════ */

/**
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  fadeIn,
  fadeOut,
  animateModalOpen,
  animateModalClose,
  notifyPulse,
  prefersReducedMotion,
  EASING,
};
