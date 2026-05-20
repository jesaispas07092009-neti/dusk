const HOST_ID = 'dusk-toast-host';
const DEFAULT_DURATION = 3200;

const timers = new Map();
const nodes = new Map();

function ensureHost() {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(HOST_ID);
  if (existing) return existing;

  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => {
      ensureHost();
    }, { once: true });
    return null;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'true');
  host.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'z-index:9999',
    'display:grid',
    'gap:10px',
    'max-width:min(92vw,360px)',
    'pointer-events:none',
  ].join(';');

  document.body.appendChild(host);
  return host;
}

function variantStyle(variant) {
  if (variant === 'error') {
    return {
      bg: 'rgba(200,74,74,0.14)',
      border: 'rgba(200,74,74,0.32)',
      fg: 'var(--color-text)',
      iconBg: 'rgba(200,74,74,0.22)',
      iconFg: '#c84a4a',
    };
  }

  if (variant === 'success') {
    return {
      bg: 'rgba(76,175,122,0.14)',
      border: 'rgba(76,175,122,0.32)',
      fg: 'var(--color-text)',
      iconBg: 'rgba(76,175,122,0.22)',
      iconFg: '#4a8f7a',
    };
  }

  if (variant === 'loading') {
    return {
      bg: 'rgba(255,255,255,0.06)',
      border: 'var(--color-border)',
      fg: 'var(--color-text)',
      iconBg: 'rgba(255,255,255,0.10)',
      iconFg: 'var(--color-text-muted)',
    };
  }

  return {
    bg: 'rgba(74,122,181,0.14)',
    border: 'rgba(74,122,181,0.28)',
    fg: 'var(--color-text)',
    iconBg: 'rgba(74,122,181,0.22)',
    iconFg: '#4a7ab5',
  };
}

function iconFor(variant) {
  if (variant === 'error') return '⚠';
  if (variant === 'success') return '✓';
  if (variant === 'loading') return '⟳';
  return 'i';
}

function dismiss(id) {
  const node = nodes.get(id);
  if (!node) return;

  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  nodes.delete(id);
  node.remove();
}

function show(variant, message, { duration = DEFAULT_DURATION } = {}) {
  const host = ensureHost();
  if (!host || !message) return null;

  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const style = variantStyle(variant);
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'display:flex',
    'align-items:flex-start',
    'gap:12px',
    'padding:12px 14px',
    'border-radius:18px',
    `background:${style.bg}`,
    `border:1px solid ${style.border}`,
    'backdrop-filter:blur(14px)',
    'box-shadow:0 16px 36px rgba(0,0,0,0.22)',
    `color:${style.fg}`,
    'pointer-events:auto',
  ].join(';');

  const iconWrap = document.createElement('div');
  iconWrap.textContent = iconFor(variant);
  iconWrap.style.cssText = [
    'width:28px',
    'height:28px',
    'min-width:28px',
    'border-radius:999px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    `background:${style.iconBg}`,
    `color:${style.iconFg}`,
    'font-family:var(--font-mono, monospace)',
    'font-size:0.85rem',
    'line-height:1',
    'margin-top:1px',
  ].join(';');

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;min-width:0;font-family:var(--font-mono, monospace);font-size:0.78rem;line-height:1.45;white-space:pre-wrap;word-break:break-word;';
  body.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fermer la notification');
  close.textContent = '×';
  close.style.cssText = [
    'margin-left:2px',
    'border:0',
    'background:transparent',
    `color:${style.fg}`,
    'cursor:pointer',
    'font-size:1rem',
    'line-height:1',
    'opacity:0.75',
    'padding:0',
  ].join(';');
  close.addEventListener('click', () => dismiss(id));

  toast.append(iconWrap, body, close);
  host.appendChild(toast);
  nodes.set(id, toast);

  if (duration > 0) {
    const timer = setTimeout(() => dismiss(id), duration);
    timers.set(id, timer);
  }

  return id;
}

export const notify = {
  success(message, options) {
    return show('success', message, options);
  },
  error(message, options) {
    return show('error', message, options);
  },
  info(message, options) {
    return show('info', message, options);
  },
  loading(message, options = {}) {
    return show('loading', message, { duration: 0, ...options });
  },
  dismiss,
};
