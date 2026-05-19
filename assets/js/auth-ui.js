import { state } from './state.js';
import { signIn, signUp } from './auth.js';

const AUTH_ROOT_ID = 'auth-root';
let mounted = false;

function root() {
  return document.getElementById(AUTH_ROOT_ID);
}

function setError(rootEl, message) {
  const errorEl = rootEl.querySelector('[data-auth-error]');
  if (errorEl) errorEl.textContent = message || '';
}

function closeAuth() {
  state.set('ui.authOpen', false);
  const rootEl = root();
  if (!rootEl) return;
  rootEl.classList.remove('is-open');
  rootEl.innerHTML = '';
}

async function handleSubmit(form, mode) {
  const rootEl = root();
  if (!rootEl) return;

  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const name = form.querySelector('[name="name"]')?.value.trim() || '';
  setError(rootEl, '');

  try {
    if (mode === 'signup') {
      const session = await signUp({ email, password, name });
      if (session) {
        closeAuth();
      } else {
        setError(rootEl, "Compte créé. Vérifie ta boîte mail si la confirmation est activée.");
      }
    } else {
      await signIn(email, password);
      closeAuth();
    }
  } catch (error) {
    setError(rootEl, error?.message || 'Impossible de se connecter.');
  }
}

function render(mode = 'login') {
  const rootEl = root();
  if (!rootEl) return;

  state.set('ui.authOpen', true);
  rootEl.classList.add('is-open');
  rootEl.innerHTML = `
    <div class="auth-backdrop" data-auth-close></div>
    <section class="auth-card" role="dialog" aria-modal="true" aria-label="Connexion à Dusk">
      <div class="auth-card__header">
        <div>
          <div class="auth-kicker">Dusk</div>
          <h2 class="auth-title">Accéder à ton espace</h2>
          <p class="auth-subtitle">Connexion et synchronisation des widgets avec Supabase.</p>
        </div>
        <button class="auth-close" type="button" aria-label="Fermer" data-auth-close>×</button>
      </div>

      <div class="auth-tabs" role="tablist">
        <button class="auth-tab ${mode === 'login' ? 'active' : ''}" type="button" data-auth-mode="login">Connexion</button>
        <button class="auth-tab ${mode === 'signup' ? 'active' : ''}" type="button" data-auth-mode="signup">Inscription</button>
      </div>

      <div class="auth-error" data-auth-error></div>

      <form class="auth-form" data-auth-form>
        ${mode === 'signup' ? `
          <label class="auth-field">
            <span>Nom</span>
            <input name="name" type="text" placeholder="Ton nom" maxlength="50" />
          </label>
        ` : ''}
        <label class="auth-field">
          <span>Email</span>
          <input name="email" type="email" placeholder="toi@example.com" required />
        </label>
        <label class="auth-field">
          <span>Mot de passe</span>
          <input name="password" type="password" placeholder="••••••••" minlength="6" required />
        </label>
        <div class="auth-actions">
          <button class="auth-submit" type="submit">${mode === 'signup' ? 'Créer le compte' : 'Se connecter'}</button>
        </div>
      </form>
    </section>
  `;

  rootEl.querySelectorAll('[data-auth-close]').forEach(el => {
    el.addEventListener('click', closeAuth);
  });
  rootEl.querySelectorAll('[data-auth-mode]').forEach(el => {
    el.addEventListener('click', () => render(el.dataset.authMode));
  });
  const form = rootEl.querySelector('[data-auth-form]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    await handleSubmit(form, mode);
  });
}

export function openAuth(mode = 'login') {
  if (!mounted) mounted = true;
  render(mode);
}

export function hideAuth() {
  closeAuth();
}
