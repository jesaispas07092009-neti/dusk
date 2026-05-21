/* ═══════════════════════════════════════════════════════════
   DUSK — consent.js
   Gestion du consentement à la collecte de données techniques.

   Responsabilités :
   - Lire / écrire la préférence dans localStorage
   - Afficher le bandeau de consentement au premier chargement
   - Exposer hasConsented() pour conditionner pushDeviceIntel()
   - Émettre un event 'dusk:consent' une fois la décision prise
═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'dusk-v2:consent';

/* ── Valeurs possibles ──────────────────────────────────────
   null     → pas encore décidé (premier chargement)
   'yes'    → accepté
   'no'     → refusé
─────────────────────────────────────────────────────────── */

function readConsent() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function writeConsent(value) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch {}
}

/**
 * Retourne true si l'utilisateur a explicitement accepté la collecte.
 */
export function hasConsented() {
  return readConsent() === 'yes';
}

/**
 * Retourne true si l'utilisateur a déjà pris une décision (oui ou non).
 */
export function hasDecided() {
  const v = readConsent();
  return v === 'yes' || v === 'no';
}

/* ── Rendu du bandeau ────────────────────────────────────── */

function buildBanner() {
  const banner = document.createElement('div');
  banner.id = 'dusk-consent-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-label', 'Consentement à la collecte de données');

  banner.style.cssText = `
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 9999;
    padding: 0 var(--space-6) var(--space-5);
    display: flex;
    justify-content: center;
    pointer-events: none;
    animation: fade-up var(--duration-slow) var(--ease-emerge) both;
  `;

  banner.innerHTML = `
    <div style="
      max-width: 640px;
      width: 100%;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border-warm);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      pointer-events: all;
      box-shadow: 0 -2px 40px rgba(0,0,0,0.4);
    ">

      <div style="display:flex;align-items:flex-start;gap:var(--space-4)">
        <div style="
          flex-shrink:0;width:36px;height:36px;border-radius:50%;
          background:var(--color-accent-dim);border:1px solid var(--color-border-warm);
          display:flex;align-items:center;justify-content:center;font-size:1rem;
        ">🔍</div>
        <div style="flex:1;min-width:0">
          <div style="
            font-family:var(--font-display);
            font-size:var(--text-base);
            color:var(--color-text);
            margin-bottom:var(--space-2);
          ">Collecte de données techniques</div>
          <p style="
            font-family:var(--font-mono);
            font-size:var(--text-xs);
            color:var(--color-text-muted);
            line-height:1.7;
            margin:0;
          ">
            Dusk peut collecter des informations sur votre appareil (navigateur, OS, résolution,
            fuseau horaire, localisation approximative par IP) pour améliorer l'expérience et
            fournir des statistiques anonymisées à l'administrateur.<br>
            <span style="color:var(--color-text-faint)">
              Ces données ne sont jamais revendues ni partagées.
              Vous pouvez changer d'avis à tout moment dans les paramètres.
            </span>
          </p>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
        <button id="dusk-consent-accept" style="
          font-family:var(--font-mono);font-size:var(--text-xs);
          padding:var(--space-2) var(--space-5);
          border-radius:999px;
          border:1px solid var(--color-accent);
          background:var(--color-accent-dim);
          color:var(--color-accent);
          cursor:pointer;
          transition:background var(--duration-fast);
        ">
          Accepter
        </button>
        <button id="dusk-consent-decline" style="
          font-family:var(--font-mono);font-size:var(--text-xs);
          padding:var(--space-2) var(--space-5);
          border-radius:999px;
          border:1px solid var(--color-border);
          background:transparent;
          color:var(--color-text-muted);
          cursor:pointer;
          transition:background var(--duration-fast);
        ">
          Refuser
        </button>
        <span style="
          margin-left:auto;
          font-family:var(--font-mono);font-size:0.6rem;
          color:var(--color-text-faint);
        ">Dusk v2 · RGPD</span>
      </div>

    </div>
  `;

  return banner;
}

/* ── Animation de sortie ─────────────────────────────────── */

function dismissBanner(banner) {
  banner.style.transition = 'opacity 0.3s, transform 0.3s';
  banner.style.opacity    = '0';
  banner.style.transform  = 'translateY(16px)';
  setTimeout(() => banner.remove(), 350);
}

/* ── Événement interne ───────────────────────────────────── */

function emitConsentEvent(accepted) {
  window.dispatchEvent(new CustomEvent('dusk:consent', { detail: { accepted } }));
}

/* ── API publique ────────────────────────────────────────── */

/**
 * Affiche le bandeau si l'utilisateur n'a pas encore décidé.
 * Résout la Promise dès qu'une décision est prise.
 * @returns {Promise<boolean>} true si accepté, false si refusé
 */
export function promptConsent() {
  return new Promise(resolve => {
    // Décision déjà prise → on résout immédiatement
    if (hasDecided()) {
      resolve(hasConsented());
      return;
    }

    const banner = buildBanner();
    document.body.appendChild(banner);

    function decide(accepted) {
      writeConsent(accepted ? 'yes' : 'no');
      emitConsentEvent(accepted);
      dismissBanner(banner);
      resolve(accepted);
    }

    banner.querySelector('#dusk-consent-accept').addEventListener('click', () => decide(true));
    banner.querySelector('#dusk-consent-decline').addEventListener('click', () => decide(false));
  });
}

/**
 * Réinitialise le consentement (utile depuis les paramètres).
 * Affiche à nouveau le bandeau.
 * @returns {Promise<boolean>}
 */
export function resetConsent() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return promptConsent();
}

/**
 * Permet à l'utilisateur de changer son choix sans supprimer le cookie :
 * passe directement à la valeur souhaitée.
 * @param {'yes'|'no'} value
 */
export function setConsent(value) {
  if (value !== 'yes' && value !== 'no') return;
  writeConsent(value);
  emitConsentEvent(value === 'yes');
}
