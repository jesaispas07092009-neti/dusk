import { supabase, isSupabaseConfigured } from './supabase.js';
import { state } from './state.js';

const listeners = new Set();
let authBootstrapped = false;
let authSubscription = null;

function syncState(session) {
  state.set('session', session);
  state.set('user.id', session?.user?.id ?? null);
  state.set('user.email', session?.user?.email ?? null);
  return session;
}

function emit(session) {
  listeners.forEach(fn => {
    try { fn(session); } catch {}
  });
}

export function onAuthChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function bootstrapAuth() {
  if (!isSupabaseConfigured || !supabase) {
    authBootstrapped = true;
    syncState(null);
    return null;
  }

  if (!authSubscription) {
    authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      syncState(session);
      emit(session);
    });
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  authBootstrapped = true;
  syncState(data.session ?? null);
  return data.session ?? null;
}

export function isAuthReady() {
  return authBootstrapped;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  syncState(data.session ?? null);
  emit(data.session ?? null);
  return data.session ?? null;
}

export async function signUp({ email, password, name }) {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
    },
  });
  if (error) throw error;
  syncState(data.session ?? null);
  emit(data.session ?? null);
  return data.session ?? null;
}

export async function signOut() {
  if (!supabase) {
    syncState(null);
    emit(null);
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  syncState(null);
  emit(null);
}

export function getCurrentUser() {
  return state.get('session')?.user ?? null;
}
