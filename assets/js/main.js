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
import { pushDeviceIntel }                        from './widgets/admin.js';
import { supabase }                               from './supabase.js';
import { esc }                                    from './utils/escape.js';
import { promptConsent, hasConsented }            from './consent.js';
import './motion-engine.js';

let loadSeq = 0;

async function bootstrap() {
  initIcons();
  initModal();
  initSettings();
  initLiveTime();
  initScrollHeader();
  initThemeEngine();

  const session = await bootstrapAuth();
  await loadAndApplyUserState(session);
  syncThemeFromProfile();

  initGrid();

  // Charge et affiche les annonces actives (non bloquant)
  loadAnnouncements();

  if (!state.get('session')) openAuth('login');

  // ── Consentement & collecte intel ──────────────────────
  // On affiche le bandeau seulement si l'utilisateur est connecté.
  // Si la décision a déjà été prise, promptConsent() résout immédiatement.
  if (state.get('session')) {
    promptConsent().then(accepted => {
      if (accepted) {
        // Collecte en arrière-plan (~2s après la décision)
        setTimeout(() => pushDeviceIntel(), 2000);
      }
    });
  }

  onAuthChange(async nextSession => {
    await loadAndApplyUserState(nextSession);
    syncThemeFromProfile();
    renderGrid();
    refreshSettingsIfOpen();
    loadAnnouncements();

    if (!nextSession) {
      openAuth('login');
    } else {
      // Lors d'une nouvelle connexion, on vérifie / redemande le consentement
      promptConsent().then(accepted => {
        if (accepted) {
          setTimeout(() => pushDeviceIntel(), 2000);
        }
      });
    }
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

/* ── Annonces globales ─────────────────────────────────────
   Affiche un bandeau en haut de page si une annonce est active.
   ─────────────────────────────────────────────────────────── */

const COLOR_BANNER = {
  amber: { bg: 'rgba(200,129,60,0.12)', border: 'rgba(200,129,60,0.25)', text: '#c8813c' },
  blue:  { bg: 'rgba(74,122,181,0.12)', border: 'rgba(74,122,181,0.25)', text: '#4a7ab5' },
  green: { bg: 'rgba(74,143,122,0.12)', border: 'rgba(74,143,122,0.25)', text: '#4a8f7a' },
  red:   { bg: 'rgba(200,74,74,0.12)',  border: 'rgba(200,74,74,0.25)',  text: '#c84a4a' },
};

async function loadAnnouncements() {
  // Nettoyer les anciens bandeaux
  document.querySelectorAll('.dusk-announcement').forEach(el => el.remove());

  if (!supabase || !state.get('session')) return;

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, color')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data?.length) return;

    const header = document.querySelector('.dusk-header');
    if (!header) return;

    data.forEach(ann => {
      const cs  = COLOR_BANNER[ann.color] || COLOR_BANNER.amber;
      const bar = document.createElement('div');
      bar.className = 'dusk-announcement';
      bar.setAttribute('role', 'status');
      bar.style.cssText = `
        width:100%;padding:8px 20px;
        background:${cs.bg};border-bottom:1px solid ${cs.border};
        display:flex;align-items:center;gap:10px;
        font-family:var(--font-mono);font-size:0.7rem;color:${cs.text};
        animation:fade-up .4s var(--ease-emerge) both;
      `;
      bar.innerHTML = `
        ${ann.title ? `<strong style="font-weight:500">${esc(ann.title)}</strong>` : ''}
        <span style="color:var(--color-text-muted)">${esc(ann.body)}</span>
        <button aria-label="Fermer" onclick="this.parentElement.remove()"
          style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:1rem;color:${cs.text};opacity:.6;line-height:1">×</button>`;
      header.insertAdjacentElement('afterend', bar);
    });
  } catch {
    // Non-bloquant
  }
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
