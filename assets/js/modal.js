/* ═══════════════════════════════════════════════════════════
   DUSK — modal.js
═══════════════════════════════════════════════════════════ */
import { state } from './state.js';

function refs() {
  return {
    modalEl: document.getElementById('dusk-modal'),
    backdropEl: document.getElementById('modal-backdrop'),
    containerEl: document.getElementById('modal-container'),
    titleEl: document.getElementById('modal-title'),
    contentEl: document.getElementById('modal-content'),
    closeBtnEl: document.getElementById('modal-close'),
  };
}

let lastFocused = null;
let cleanupFn = null;
let modalBound = false;

export function openModal(widgetId, title, renderDetailFn) {
  const { modalEl, titleEl, contentEl, closeBtnEl } = refs();
  if (!modalEl || !titleEl || !contentEl || !closeBtnEl) return;

  lastFocused = document.activeElement;

  state.set('modal.isOpen', true);
  state.set('modal.widgetId', widgetId);

  titleEl.textContent = title || 'Widget';
  contentEl.innerHTML = '';

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

  modalEl.removeAttribute('aria-hidden');
  modalEl.classList.add('is-open');
  document.body.classList.add('modal-open');

  setTimeout(() => closeBtnEl.focus(), 50);
}

export function closeModal() {
  const { modalEl, contentEl } = refs();
  if (!modalEl || !contentEl) return;

  if (typeof cleanupFn === 'function') {
    try { cleanupFn(); } catch {}
    cleanupFn = null;
  }

  state.set('modal.isOpen', false);
  state.set('modal.widgetId', null);

  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.classList.remove('is-open');
  document.body.classList.remove('modal-open');

  setTimeout(() => { contentEl.innerHTML = ''; }, 520);

  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
    lastFocused = null;
  }
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

  containerEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !state.get('modal.isOpen')) return;
    const focusable = containerEl.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
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
