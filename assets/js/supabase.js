import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function wrapSupabaseError(operation, error) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String(error.message || '')
          : String(error || '');

  const message = rawMessage.trim() || 'Erreur Supabase inconnue';
  const wrapped = new Error(`[${operation}] ${message}`);
  if (error && typeof error === 'object') wrapped.cause = error;
  return wrapped;
}

export function isLikelyNetworkError(error) {
  const message = String(
    error instanceof Error ? error.message : error?.message || error || ''
  ).toLowerCase();

  return (
    error?.name === 'TypeError'
    || message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('load failed')
    || message.includes('network request failed')
  );
}
