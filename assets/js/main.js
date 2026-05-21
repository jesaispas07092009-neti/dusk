/* ═══════════════════════════════════════════════════════════
   DUSK — main.js
═══════════════════════════════════════════════════════════ */
import { initGrid, renderGrid }                   from './grid.js';
import { initModal }                              from './modal.js';
import { state }                                  from './state.js';
import { bootstrapAuth, onAuthChange }            from './auth.js';
import { openAuth }                               from './auth-ui.js';
import { initSettings, refreshSettingsIfOpen }   from './settings.js';
import { loadDashboardData }                      from './user-data.js';
import { initThemeEngine, syncThemeFromProfile }  from './theme-engine.js';
// motion-engine est importé ici pour s'assurer qu'il est chargé dès le départ.
// Les modules qui l'utilisent (grid.js, modal.js) l'importent directement,
// mais cet import garantit que --motion-speed est lisible dès bootstrap().
import './motion-engine.js';

let loadSeq = 0;

async function bootstrap() {
  initIcons();
  initModal();
  initSettings();
  initLiveTime();
  initScrollHeader();

  /* Theme engine : applique le thème initial depuis localStorage
     AVANT le rendu de la grille, pour éviter tout flash visuel.
     Motion-engine lira ensuite --motion-speed depuis le thème appliqué. */
  initThemeEngine();

  const session = await bootstrapAuth();
  await loadAndApplyUserState(session);

  /* Après le chargement du profil, synchroniser le thème Supabase
     (peut différer du localStorage si l'utilisateur a changé d'appareil) */
  syncThemeFromProfile();

  initGrid();
  if (!state.get('session')) openAuth('login');

  onAuthChange(async nextSession => {
    await loadAndApplyUserState(nextSession);
    syncThemeFromProfile();
    renderGrid();
    refreshSettingsIfOpen();
    if (!nextSession) openAuth('login');
  });
}

async function loadAndApplyUserState(session) {
  const seq = ++loadSeq;

  const userId = session?.user?.id || null;
  const email  = session?.user?.email || null;

  if (!userId) {
    if (seq !== loadSeq) return;
    state.set('session',           null);
    state.set('user.id',           null);
    state.set('user.email',        null);
    state.set('user.profile',      null);
    state.set('user.widgetPrefs',  []);
    state.set('user.todos',        []);
    state.set('user.links',        []);
    state.set('user.projects',     []);
    state.set('user.moodLog',      []);
    state.set('user.mood',         null);
    state.set('user.worldmap',     []);
    return;
  }

  const data = await loadDashboardData({ userId, email });
  if (seq !== loadSeq) return;

  state.set('session',          session);
  state.set('user.id',          userId);
  state.set('user.email',       email);
  state.set('user.profile',     data.profile);
  state.set('user.widgetPrefs', data.widgetPrefs);
  state.set('user.todos',       data.todos);
  state.set('user.links',       data.links);
  state.set('user.projects',    data.projects);
  state.set('user.moodLog',     data.moodLog);
  state.set('user.mood',        data.mood || null);
  state.set('user.worldmap',    data.worldmap || []);
}

function initIcons() {
  if (window.lucide) lucide.createIcons();
}

function initLiveTime() {
  const el = document.getElementById('live-time');
  if (!el) return;

  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    el.textContent = `${h}:${m}`;
    state.set('time.current', now);
  }

  tick();
  const msToNext = (60 - new Date().getSeconds()) * 1000;
  setTimeout(() => {
    tick();
    setInterval(tick, 60_000);
  }, msToNext);
}

function initScrollHeader() {
  const header = document.querySelector('.dusk-header');
  if (!header) return;

  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none;';
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting),
    { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
  ).observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch(err => {
    console.error('Dusk bootstrap error:', err);
    openAuth('login');
  });
});
