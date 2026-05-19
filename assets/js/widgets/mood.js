/* ── Widget : Ambiances ──────────────────────────────────── */
import { state } from '../state.js';
import { saveMood } from '../user-data.js';

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

    container.querySelectorAll('[data-mood]').forEach(el => {
      el.addEventListener('click', async e => {
        e.stopPropagation();
        const id = el.dataset.mood;
        const selected = MOODS.find(m => m.id === id);
        const entry = { mood: id, note: selected?.desc || '', logged_at: new Date().toISOString() };
        setCurrentMood(entry);
        await saveMood(state.get('user.id'), entry).catch(() => {});
        const bodyEl = el.closest('.widget-body');
        if (bodyEl) moodWidget.render(bodyEl);
      });
    });
  },

  renderDetail(container) {
    function render() {
      const current = getCurrentMood();
      container.innerHTML = `
        <div style="max-width:500px;margin:0 auto">
          <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);margin-bottom:var(--space-6)">Comment te sens-tu ?</div>
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
        </div>`;

      container.querySelectorAll('[data-mood]').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.dataset.mood;
          const selected = MOODS.find(m => m.id === id);
          const entry = { mood: id, note: selected?.desc || '', logged_at: new Date().toISOString() };
          setCurrentMood(entry);
          await saveMood(state.get('user.id'), entry).catch(() => {});
          render();
        });
      });
    }

    render();
  },
};
