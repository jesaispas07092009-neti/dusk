/* ═══════════════════════════════════════════════════════════
   DUSK — main.js
═══════════════════════════════════════════════════════════ */
import { initGrid, renderGrid } from './grid.js';
import { initModal } from './modal.js';
import { state } from './state.js';
import { bootstrapAuth, onAuthChange } from './auth.js';
import { openAuth } from './auth-ui.js';
import { initSettings, refreshSettingsIfOpen } from './settings.js';
import { loadDashboardData } from './user-data.js';

async function bootstrap() {
  initIcons();
  initModal();
  initSettings();
  initLiveTime();
  initScrollHeader();

  const session = await bootstrapAuth();
  await loadAndApplyUserState(session);

  initGrid();
  if (!state.get('session')) openAuth('login');

  onAuthChange(async nextSession => {
    await loadAndApplyUserState(nextSession);
    renderGrid();
    refreshSettingsIfOpen();
    if (!nextSession) openAuth('login');
  });
}

async function loadAndApplyUserState(session) {
  const userId = session?.user?.id || null;
  const email = session?.user?.email || null;
  const data = await loadDashboardData({ userId, email });

  state.set('user.profile', data.profile);
  state.set('user.widgetPrefs', data.widgetPrefs);
  state.set('user.todos', data.todos);
  state.set('user.links', data.links);
  state.set('user.projects', data.projects);
  state.set('user.moodLog', data.moodLog);
  state.set('user.mood', data.mood || null);
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
  setTimeout(() => { tick(); setInterval(tick, 60_000); }, msToNext);
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
