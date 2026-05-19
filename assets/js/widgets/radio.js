/* ── Widget : Radio / Musique ─────────────────────────────── */
// Stub — brancher une vraie source audio si besoin

const STATIONS = [
  { name: 'Lofi Hip-Hop',    emoji: '🎵', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', color: '#4a7ab5' },
  { name: 'Jazz Nocturne',   emoji: '🎷', url: 'https://www.youtube.com/watch?v=neV3EPgvZ3g', color: '#c8813c' },
  { name: 'Ambient Dreams',  emoji: '🌌', url: 'https://www.youtube.com/watch?v=XULUBg_ZcAU', color: '#8b5cf6' },
  { name: 'Classical Focus', emoji: '🎻', url: 'https://www.youtube.com/watch?v=4Tr0otuiQuU', color: '#4a8f7a' },
  { name: 'Deep Focus',      emoji: '🧠', url: 'https://www.youtube.com/watch?v=UrFGFIQh3-4', color: '#c84a4a' },
];

export const radioWidget = {
  id:    'radio',
  label: 'Radio',
  size:  'small',
  expandable: true,

  render(container) {
    container.innerHTML = `
      <div class="wc-center" style="gap:var(--space-2)">
        <div style="font-size:1.5rem">🎵</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted);letter-spacing:0.08em">Radio Dusk</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">5 stations</div>
      </div>`;
  },

  renderDetail(container) {
    container.innerHTML = `
      <div style="max-width:480px;margin:0 auto">
        <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);margin-bottom:var(--space-6)">Stations</div>
        <div class="links-list">
          ${STATIONS.map(s => `
            <a class="link-item" href="${s.url}" target="_blank" rel="noopener"
              style="border-left:3px solid ${s.color}40">
              <span class="link-icon">${s.emoji}</span>
              <div>
                <div class="link-label">${s.name}</div>
                <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--color-text-faint);letter-spacing:0.08em">Ouvrir YouTube →</div>
              </div>
            </a>`).join('')}
        </div>
        <div style="margin-top:var(--space-6);padding:var(--space-4);background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);letter-spacing:0.08em">
            💡 Pour intégrer un vrai player audio, brancher une API Spotify, SoundCloud ou un flux radio .m3u8
          </div>
        </div>
      </div>`;
  },
};
