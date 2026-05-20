/* ── Widget : Ambiances ──────────────────────────────────── */
import { state } from '../state.js';
import { saveMood } from '../user-data.js';
import { persistMutation } from '../lib/persist.js';
import { renderGrid } from '../grid.js';

const MOODS = [
  { id: 'focus', name: 'Focus', emoji: '🎯', color: '#4a7ab5', desc: 'Concentration totale' },
  { id: 'chill', name: 'Chill', emoji: '🌊', color: '#4a8f7a', desc: 'Détente et fluidité' },
  { id: 'energy', name: 'Énergie', emoji: '⚡', color: '#c8813c', desc: 'Plein de vitalité' },
  { id: 'creative', name: 'Créatif', emoji: '🎨', color: '#8b5cf6', desc: 'Inspiration et fluidité' },
  { id: 'dusk', name: 'Dusk', emoji: '🌇', color: '#c84a4a', desc: 'Heure dorée' },
  { id: 'nature', name: 'Nature', emoji: '🌿', color: '#5c8a4a', desc: 'Calme naturel' },
];

function getCurrentMood() {
  return state.get('user.mood')?.mood || null;
}

function setCurrentMood(moodEntry) {
  state.set('user.mood', moodEntry);
}

function cloneMoodLog(log) {
  return (log || []).map(entry => ({ ...entry }));
}

export const moodWidget = {
  id: 'mood',
  label: 'Ambiance',
  size: 'medium',

  render(container) {
    const current = getCurrentMood();
    const mood = MOODS.find(m => m.id === current);

    container.innerHTML = `
      <div class="wc-fill" style="gap:var(--space-2)">
        <div class="mood-grid">
          ${MOODS.slice(0, 4).map(m => `
            <div class="mood-card ${current === m.id ? 'active' : ''}"
              style="background:${m.id === current ? m.color + '20' : 'var(--color-surface-2)'}"
              data-mood="${m.id}">
              <span class="mood-card-icon">${m.emoji}</span>
              <span class="mood-card-name">${m.name}</span>
            </div>`).join('')}
        </div>
        ${mood ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-1)">Ambiance : ${mood.name}</div>` : ''}
      </div>`;
  },

  renderDetail(container) {
    let syncMessage = '';
    let syncError = false;
    let statusTimer = null;

    function setStatus(message = '', error = false, autoClear = false) {
      syncMessage = message;
      syncError = error;

      if (statusTimer) {
        clearTimeout(statusTimer);
        statusTimer = null;
      }

      if (autoClear && message) {
        statusTimer = setTimeout(() => {
          if (!container.isConnected) return;
          syncMessage = '';
          syncError = false;
          render();
        }, 2000);
      }
    }

    async function persistMood(entry, previousMood, previousLog) {
      setCurrentMood(entry);
      const nextLog = [entry, ...cloneMoodLog(previousLog).filter(item => item.logged_at !== entry.logged_at)].slice(0, 20);
      state.set('user.moodLog', nextLog);
      setStatus('Sauvegarde…');
      render();
      renderGrid();

      try {
        await persistMutation({
          action: () => saveMood(state.get('user.id'), entry),
          rollback: () => {
            setCurrentMood(previousMood);
            state.set('user.moodLog', previousLog);
          },
          errorMessage: 'Impossible de sauvegarder l’ambiance.',
        });
        setStatus('Sauvegardé', false, true);
        renderGrid();
        render();
      } catch (err) {
        console.error('Mood save failed:', err);
        setStatus('Erreur de sauvegarde', true);
        renderGrid();
        render();
      }
    }

    function render() {
      const current = getCurrentMood();
      const mood = MOODS.find(m => m.id === current);

      container.innerHTML = `
        <div style="max-width:500px;margin:0 auto">
          <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);margin-bottom:var(--space-6)">Comment te sens-tu ?</div>
          <div style="margin-bottom:var(--space-3);font-family:var(--font-mono);font-size:var(--text-xs);color:${syncError ? '#c84a4a' : 'var(--color-text-faint)'}">
            ${syncMessage}
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3)">
            ${MOODS.map(m => `
              <div class="mood-card ${current === m.id ? 'active' : ''}"
                style="background:${current === m.id ? m.color + '20' : 'var(--color-surface-2)'};padding:var(--space-5)"
                data-mood="${m.id}">
                <span style="font-size:2rem">${m.emoji}</span>
                <div style="font-family:var(--font-display);font-size:var(--text-base);color:var(--color-text);margin-top:var(--space-2)">${m.name}</div>
                <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)">${m.desc}</div>
              </div>`).join('')}
          </div>
          ${mood ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-top:var(--space-4)">Ambiance active : ${mood.name}</div>` : ''}
        </div>`;

      container.querySelectorAll('[data-mood]').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.dataset.mood;
          const selected = MOODS.find(m => m.id === id);
          const previousMood = state.get('user.mood') || null;
          const previousLog = cloneMoodLog(state.get('user.moodLog') || []);
          const entry = { mood: id, note: selected?.desc || '', logged_at: new Date().toISOString() };
          await persistMood(entry, previousMood, previousLog);
        });
      });
    }

    render();
  },
};
