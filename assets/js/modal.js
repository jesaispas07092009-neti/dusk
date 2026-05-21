/* ═══════════════════════════════════════════════════════════
   DUSK — modal.js
   Gestion de la modale plein-écran.
   Animations open/close déléguées à motion-engine.js.
═══════════════════════════════════════════════════════════ */
import { state }                                   from './state.js';
import { animateModalOpen, animateModalClose }     from './motion-engine.js';

function refs() {
  return {
    modalEl:     document.getElementById('dusk-modal'),
    backdropEl:  document.getElementById('modal-backdrop'),
    containerEl: document.getElementById('modal-container'),
    titleEl:     document.getElementById('modal-title'),
    contentEl:   document.getElementById('modal-content'),
    closeBtnEl:  document.getElementById('modal-close'),
  };
}

let lastFocused  = null;
let cleanupFn    = null;
let modalBound   = false;
let isAnimating  = false;

function isMobile() {
  return window.innerWidth <= 767;
}

export function openModal(widgetId, title, renderDetailFn) {
  const { modalEl, backdropEl, containerEl, titleEl, contentEl, closeBtnEl } = refs();
  if (!modalEl || !titleEl || !contentEl || !closeBtnEl || isAnimating) return;

  lastFocused = document.activeElement;

  state.set('modal.isOpen',   true);
  state.set('modal.widgetId', widgetId);

  titleEl.textContent  = title || 'Widget';
  contentEl.innerHTML  = '';

  if (typeof cleanupFn === 'function') {
    try { cleanupFn(); } catch {}
  }
  cleanupFn = null;

  if (typeof renderDetailFn === 'function') {
    cleanupFn = renderDetailFn(contentEl) || null;
  } else {
    contentEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:300px;
        color:var(--color-text-muted);font-family:var(--font-mono);font-size:var(--text-sm);
        letter-spacing:0.08em;opacity:0.4;">
        — en construction —
      </div>`;
  }

  // Afficher la modale AVANT d'animer (sinon les éléments sont invisibles)
  modalEl.removeAttribute('aria-hidden');
  modalEl.classList.add('is-open');
  document.body.classList.add('modal-open');

  // Réinitialiser l'état visuel avant d'animer
  backdropEl.style.opacity  = '0';
  containerEl.style.opacity = '0';

  // Animation d'entrée via motion-engine (calibrée sur --motion-speed)
  animateModalOpen(backdropEl, containerEl, isMobile());

  setTimeout(() => closeBtnEl.focus(), 50);
}

export function closeModal() {
  const { modalEl, backdropEl, containerEl, contentEl } = refs();
  if (!modalEl || !contentEl || isAnimating) return;
  if (!state.get('modal.isOpen')) return;

  isAnimating = true;

  state.set('modal.isOpen',   false);
  state.set('modal.widgetId', null);

  // Animation de sortie via motion-engine, attend la fin pour nettoyer
  animateModalClose(backdropEl, containerEl, isMobile()).then(() => {
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    // Réinitialiser les styles inline posés par les animations
    backdropEl.style.opacity  = '';
    containerEl.style.opacity = '';
    containerEl.style.transform = '';

    if (typeof cleanupFn === 'function') {
      try { cleanupFn(); } catch {}
      cleanupFn = null;
    }
    contentEl.innerHTML = '';

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
      lastFocused = null;
    }
    isAnimating = false;
  });
}

export function initModal() {
  if (modalBound) return;
  modalBound = true;

  const { backdropEl, closeBtnEl, containerEl } = refs();
  if (!backdropEl || !closeBtnEl || !containerEl) return;

  closeBtnEl.addEventListener('click', closeModal);
  backdropEl.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.get('modal.isOpen')) closeModal();
  });

  // Trap focus dans la modale
  containerEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !state.get('modal.isOpen')) return;
    const focusable = containerEl.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
