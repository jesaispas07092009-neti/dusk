/* ── Widget : Lever / Coucher du soleil ──────────────────── */
import { esc } from '../utils/escape.js';
const CACHE_KEY = 'dusk-sunrise-cache-v1';
const CACHE_TTL = 12 * 60 * 60 * 1000;

let pendingRequest = null;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${Math.max(0, minutes)} min`;
  }

  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.dayKey !== currentDayKey()) return null;
    if (Date.now() - Number(parsed.savedAt || 0) > CACHE_TTL) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('La géolocalisation n’est pas disponible.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      error => reject(error instanceof Error ? error : new Error(error?.message || 'Impossible de récupérer la position.')),
      { timeout: 8000, maximumAge: 60_000 }
    );
  });
}

async function fetchSunData() {
  const cached = readCache();
  if (cached) return cached;

  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const position = await getCurrentPosition();
    const { latitude: lat, longitude: lon } = position.coords;

    let city = 'Ma position';
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        city = geoData?.address?.city
          || geoData?.address?.town
          || geoData?.address?.village
          || geoData?.address?.municipality
          || city;
      }
    } catch {
      // fallback to generic label
    }

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&daily=sunrise,sunset&timezone=auto&forecast_days=1`;

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error('Impossible de charger les données du soleil.');
    }

    const data = await res.json();
    const sunriseIso = data?.daily?.sunrise?.[0];
    const sunsetIso = data?.daily?.sunset?.[0];

    if (!sunriseIso || !sunsetIso) {
      throw new Error('Aucune donnée de lever/coucher disponible.');
    }

    const sunrise = formatTime(sunriseIso);
    const sunset = formatTime(sunsetIso);
    const dayLengthMs = Math.max(0, new Date(sunsetIso).getTime() - new Date(sunriseIso).getTime());
    const now = Date.now();
    const rise = new Date(sunriseIso).getTime();
    const set = new Date(sunsetIso).getTime();
    const progress = rise < set ? clamp(((now - rise) / (set - rise)) * 100, 0, 100) : 0;

    const payload = {
      dayKey: currentDayKey(),
      savedAt: Date.now(),
      city,
      sunriseIso,
      sunsetIso,
      sunrise,
      sunset,
      dayLength: formatDuration(dayLengthMs),
      progress,
    };

    writeCache(payload);
    return payload;
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
}

function renderPlaceholder(container, message) {
  container.innerHTML = `
    <div class="wc-center" style="gap:var(--space-2);padding:var(--space-4) 0">
      <div style="font-size:1.4rem">☀️</div>
      <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);text-align:center">${esc(message)}</div>
    </div>`;
}

function renderCompact(container, data) {
  const now = Date.now();
  const rise = new Date(data.sunriseIso).getTime();
  const set = new Date(data.sunsetIso).getTime();
  const progress = rise < set ? clamp(((now - rise) / (set - rise)) * 100, 0, 100) : 0;
  const isDay = progress > 0 && progress < 100;

  container.innerHTML = `
    <div class="wc-fill" style="justify-content:center;gap:var(--space-3)">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:var(--space-3)">
        <div>
          <div class="wc-muted">Lever</div>
          <div class="sun-time-val">☀️ ${esc(data.sunrise)}</div>
        </div>
        <div style="font-size:1.2rem">${isDay ? '🌤' : '🌙'}</div>
        <div style="text-align:right">
          <div class="wc-muted">Coucher</div>
          <div class="sun-time-val">🌇 ${esc(data.sunset)}</div>
        </div>
      </div>
      <div style="height:6px;background:var(--color-surface-3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${progress.toFixed(1)}%;background:linear-gradient(to right,#f59e0b,#ef4444);border-radius:3px;transition:width 1s"></div>
      </div>
      <div class="wc-muted" style="text-align:center">Durée du jour : ${esc(data.dayLength)}</div>
    </div>`;
}

function renderDetailView(container, data) {
  const now = Date.now();
  const rise = new Date(data.sunriseIso).getTime();
  const set = new Date(data.sunsetIso).getTime();
  const progress = rise < set ? clamp(((now - rise) / (set - rise)) * 100, 0, 100) : 0;

  container.innerHTML = `
    <div style="padding:var(--space-8) 0;text-align:center">
      <div style="font-size:4rem">☀️</div>
      <div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text);margin-top:var(--space-3)">Soleil · ${esc(data.city)}</div>
    </div>

    <div style="max-width:520px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-muted)">
        <span>🌅 ${esc(data.sunrise)}</span><span>🌇 ${esc(data.sunset)}</span>
      </div>
      <div style="position:relative;height:12px;background:linear-gradient(to right,#1e3a5f,#f59e0b 40%,#ef4444 60%,#1a1040);border-radius:6px;overflow:hidden">
        <div style="position:absolute;inset:0 auto 0 0;width:${progress.toFixed(1)}%;background:linear-gradient(to right,#fbbf24,#f97316);"></div>
        <div style="position:absolute;top:50%;left:${progress.toFixed(1)}%;transform:translate(-50%,-50%);width:20px;height:20px;background:#fbbf24;border-radius:50%;box-shadow:0 0 12px #fbbf24;border:2px solid #fff"></div>
      </div>
      <div style="text-align:center;margin-top:var(--space-2);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-amber)">
        Position actuelle : ${progress.toFixed(0)}% de la journée
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-top:var(--space-8);max-width:520px;margin-left:auto;margin-right:auto">
      <div class="weather-stat">
        <div class="weather-stat-label">Lever</div>
        <div class="weather-stat-value">${esc(data.sunrise)}</div>
      </div>
      <div class="weather-stat">
        <div class="weather-stat-label">Durée du jour</div>
        <div class="weather-stat-value">${esc(data.dayLength)}</div>
      </div>
      <div class="weather-stat">
        <div class="weather-stat-label">Coucher</div>
        <div class="weather-stat-value">${esc(data.sunset)}</div>
      </div>
    </div>`;
}

export const sunriseWidget = {
  id: 'sunrise',
  label: 'Soleil',
  size: 'small',

  render(container) {
    renderPlaceholder(container, 'Lecture des données solaires…');

    let cancelled = false;

    fetchSunData()
      .then(data => {
        if (cancelled || !container.isConnected) return;
        renderCompact(container, data);
      })
      .catch(error => {
        if (cancelled || !container.isConnected) return;
        console.warn('[Dusk] sunrise widget:', error);
        renderPlaceholder(container, error?.message || 'Les données du soleil sont indisponibles.');
      });

    return () => {
      cancelled = true;
    };
  },

  renderDetail(container) {
    let timer = null;
    let cancelled = false;

    function refresh() {
      fetchSunData()
        .then(data => {
          if (cancelled || !container.isConnected) return;
          renderDetailView(container, data);
        })
        .catch(error => {
          if (cancelled || !container.isConnected) return;
          console.warn('[Dusk] sunrise widget detail:', error);
          renderPlaceholder(container, error?.message || 'Les données du soleil sont indisponibles.');
        });
    }

    refresh();
    timer = setInterval(refresh, 60_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  },
};
