/* ═══════════════════════════════════════════════════════════
   DUSK — theme-engine.js
   Moteur de thèmes atmosphériques.

   Responsabilités :
   - Définition des thèmes disponibles (metadata + prévisualisation)
   - Application d'un thème sur <html data-theme="...">
   - Transition douce entre thèmes (classe theme-transitioning)
   - Persistance : localStorage pour tous, Supabase si connecté
   - Synchronisation avec state.js
═══════════════════════════════════════════════════════════ */
import { state }  from './state.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

/* ── Catalogue des thèmes ──────────────────────────────────── */
export const THEMES = [
  {
    id:          'dusk',
    label:       'Dusk',
    description: 'Ambre chaud, nuit organique',
    accent:      '#c8813c',
    bg:          '#0f0e0d',
    surface:     '#201d1a',
  },
  {
    id:          'midnight',
    label:       'Midnight',
    description: 'Bleu nuit, calme absolu',
    accent:      '#7b8fe8',
    bg:          '#080810',
    surface:     '#161625',
  },
  {
    id:          'rain',
    label:       'Rain',
    description: 'Brouillard, contemplation',
    accent:      '#7fb5cc',
    bg:          '#0b0d0f',
    surface:     '#1a1e23',
  },
  {
    id:          'deep-space',
    label:       'Deep Space',
    description: 'Noir absolu, profondeur cosmique',
    accent:      '#50dc9a',
    bg:          '#03040a',
    surface:     '#0d1220',
  },
  {
    id:          'ember',
    label:       'Ember',
    description: 'Braises rouges, forge lointaine',
    accent:      '#d95c28',
    bg:          '#100808',
    surface:     '#231510',
  },
  {
    id:          'aurora',
    label:       'Aurora',
    description: 'Boréal, entre deux mondes',
    accent:      '#6ddba8',
    bg:          '#060c10',
    surface:     '#111d22',
  },
];

const THEME_IDS      = THEMES.map(t => t.id);
const DEFAULT_THEME  = 'dusk';
const LS_KEY         = 'dusk-theme';
const TRANSITION_MS  = 650;

/* ── Helpers ───────────────────────────────────────────────── */
function isValidTheme(id) {
  return THEME_IDS.includes(id);
}

function readLocalTheme() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return isValidTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeLocalTheme(id) {
  try {
    localStorage.setItem(LS_KEY, id);
  } catch {}
}

/* ── Application du thème ──────────────────────────────────── */
let _transitionTimer = null;

/**
 * Applique un thème immédiatement, sans transition.
 * Utilisé au démarrage pour éviter le flash.
 */
function applyThemeInstant(id) {
  const safeId = isValidTheme(id) ? id : DEFAULT_THEME;
  document.documentElement.dataset.theme = safeId;
}

/**
 * Applique un thème avec transition douce.
 * @param {string} id - id du thème
 * @param {boolean} [persist=true] - persister dans localStorage + Supabase
 */
export async function applyTheme(id, persist = true) {
  const safeId = isValidTheme(id) ? id : DEFAULT_THEME;
  const current = document.documentElement.dataset.theme;

  if (current === safeId) return;

  /* Transition */
  if (_transitionTimer) clearTimeout(_transitionTimer);
  document.documentElement.classList.add('theme-transitioning');
  document.documentElement.dataset.theme = safeId;

  _transitionTimer = setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
    _transitionTimer = null;
  }, TRANSITION_MS);

  /* State */
  state.set('ui.theme', safeId);

  if (!persist) return;

  /* Persistance locale */
  writeLocalTheme(safeId);

  /* Persistance Supabase si connecté */
  const userId = state.get('user.id');
  if (isSupabaseConfigured && supabase && userId) {
    try {
      await supabase
        .from('profiles')
        .update({ theme: safeId })
        .eq('id', userId);
    } catch (err) {
      console.warn('[ThemeEngine] Supabase theme save failed:', err);
    }
  }
}

/**
 * Retourne le thème actuellement actif.
 */
export function getCurrentTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

/**
 * Retourne les metadata du thème actif.
 */
export function getCurrentThemeMeta() {
  return THEMES.find(t => t.id === getCurrentTheme()) || THEMES[0];
}

/* ── Initialisation ────────────────────────────────────────── */
/**
 * À appeler dans main.js → bootstrap(), avant renderGrid().
 * Détermine le thème initial sans transition pour éviter le flash.
 *
 * Priorité :
 *  1. Profil Supabase (user.profile.theme) — déjà chargé dans state
 *  2. localStorage
 *  3. DEFAULT_THEME
 */
export function initThemeEngine() {
  const profileTheme = state.get('user.profile')?.theme;
  const localTheme   = readLocalTheme();
  const initial      = isValidTheme(profileTheme)
    ? profileTheme
    : isValidTheme(localTheme)
      ? localTheme
      : DEFAULT_THEME;

  applyThemeInstant(initial);
  state.set('ui.theme', initial);
  writeLocalTheme(initial);
}

/**
 * À appeler quand le profil est rechargé (changement de compte, etc.)
 * pour re-synchroniser le thème depuis Supabase.
 */
export function syncThemeFromProfile() {
  const profileTheme = state.get('user.profile')?.theme;
  if (isValidTheme(profileTheme) && profileTheme !== getCurrentTheme()) {
    applyTheme(profileTheme, false); // ne re-persist pas, évite la boucle
    writeLocalTheme(profileTheme);
  }
}
