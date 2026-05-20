import { isLikelyNetworkError } from '../supabase.js';
import { notify } from '../ui/notifications.js';

function defaultErrorMessage(error) {
  if (isLikelyNetworkError(error)) {
    return 'Connexion réseau interrompue. La sauvegarde a échoué.';
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String(error.message || '')
          : String(error || '');

  return message.trim() || 'Impossible de sauvegarder les modifications.';
}

export async function persistMutation({
  action,
  rollback,
  errorMessage,
  notifyError = true,
  onError,
} = {}) {
  if (typeof action !== 'function') {
    throw new TypeError('persistMutation requires an action function.');
  }

  try {
    return await action();
  } catch (error) {
    if (typeof rollback === 'function') {
      try {
        await rollback(error);
      } catch (rollbackError) {
        console.error('Dusk rollback failed:', rollbackError);
      }
    }

    if (typeof onError === 'function') {
      try {
        onError(error);
      } catch (handlerError) {
        console.error('Dusk onError handler failed:', handlerError);
      }
    }

    if (notifyError) {
      const resolved =
        typeof errorMessage === 'function'
          ? errorMessage(error)
          : errorMessage || defaultErrorMessage(error);
      notify.error(resolved);
    }

    throw error;
  }
}
