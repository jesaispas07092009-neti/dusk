/* ═══════════════════════════════════════════════════════════
   DUSK — device-intel.js
   Collecte passive d'informations client.

   Règles :
   - Aucune permission requise sauf géoloc GPS (optionnelle)
   - Si GPS refusé/absent → fallback IP via ip-api.com (gratuit, no-key)
   - Toutes les valeurs ont un fallback null / 'inconnu'
   - Ne stocke rien localement → appelé à la demande
═══════════════════════════════════════════════════════════ */

/* ── Navigateur & OS ──────────────────────────────────────── */

function parseUA() {
  const ua = navigator.userAgent || '';

  let os = 'Inconnu';
  if (/Windows NT 10/.test(ua))          os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(ua))   os = 'Windows 8.1';
  else if (/Windows/.test(ua))           os = 'Windows';
  else if (/iPhone|iPad|iPod/.test(ua))  os = 'iOS';
  else if (/Android/.test(ua))           os = 'Android';
  else if (/Mac OS X/.test(ua))          os = 'macOS';
  else if (/Linux/.test(ua))             os = 'Linux';
  else if (/CrOS/.test(ua))              os = 'ChromeOS';

  let browser = 'Inconnu';
  let version = '';
  if (/Edg\/(\d+)/.test(ua))            { browser = 'Edge';    version = ua.match(/Edg\/(\d+)/)[1]; }
  else if (/OPR\/(\d+)/.test(ua))       { browser = 'Opera';   version = ua.match(/OPR\/(\d+)/)[1]; }
  else if (/Chrome\/(\d+)/.test(ua))    { browser = 'Chrome';  version = ua.match(/Chrome\/(\d+)/)[1]; }
  else if (/Firefox\/(\d+)/.test(ua))   { browser = 'Firefox'; version = ua.match(/Firefox\/(\d+)/)[1]; }
  else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
    const m = ua.match(/Version\/(\d+)/);
    version = m ? m[1] : '';
  }

  return { os, browser, browserVersion: version || null };
}

function getDeviceType() {
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints || 0;
  if (/iPad/.test(ua) || (touch > 1 && /Mac/.test(ua))) return 'tablet';
  if (/iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile/.test(ua)) return 'mobile';
  return 'desktop';
}

/* ── Écran & fenêtre ──────────────────────────────────────── */

function getScreenInfo() {
  return {
    screenW:    screen.width,
    screenH:    screen.height,
    windowW:    window.innerWidth,
    windowH:    window.innerHeight,
    dpr:        window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth || null,
    orientation: screen.orientation?.type || null,
  };
}

/* ── CPU & mémoire ────────────────────────────────────────── */

function getHardwareInfo() {
  return {
    cpuCores:  navigator.hardwareConcurrency || null,
    ramGB:     navigator.deviceMemory || null,       // arrondi : 0.25 / 0.5 / 1 / 2 / 4 / 8
  };
}

/* ── GPU via WebGL (sans extension debug — compatible partout) */

function getGPUInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { gpu: null, gpuVendor: null };

    // WEBGL_debug_renderer_info disponible dans la plupart des navigateurs
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      return {
        gpu:       gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || null,
        gpuVendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   || null,
      };
    }
    // Fallback : renderer standard (anonymisé)
    return {
      gpu:       gl.getParameter(gl.RENDERER) || null,
      gpuVendor: gl.getParameter(gl.VENDOR)   || null,
    };
  } catch {
    return { gpu: null, gpuVendor: null };
  }
}

/* ── Réseau ───────────────────────────────────────────────── */

function getNetworkInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  return {
    online:       navigator.onLine !== false,
    connType:     conn?.effectiveType || null,  // '4g' | '3g' | '2g' | 'slow-2g'
    downlinkMbps: conn?.downlink     || null,
    rttMs:        conn?.rtt          || null,
    saveData:     conn?.saveData     || false,
  };
}

/* ── Préférences système ──────────────────────────────────── */

function getSystemPrefs() {
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return null; } };
  return {
    prefersColorScheme:        mq('(prefers-color-scheme: dark)')  ? 'dark' : 'light',
    prefersReducedMotion:      mq('(prefers-reduced-motion: reduce)'),
    prefersHighContrast:       mq('(prefers-contrast: high)'),
    prefersReducedTransparency:mq('(prefers-reduced-transparency: reduce)'),
    language:                  navigator.language || null,
    languages:                 Array.from(navigator.languages || [navigator.language]).filter(Boolean),
    timezone:                  Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    tzOffset:                  -(new Date().getTimezoneOffset()),  // en minutes, positif = est de UTC
    locale:                    Intl.DateTimeFormat().resolvedOptions().locale || null,
    cookieEnabled:             navigator.cookieEnabled,
    doNotTrack:                navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes',
  };
}

/* ── Stockage ─────────────────────────────────────────────── */

async function getStorageInfo() {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return {
        storageQuotaBytes: est.quota  || null,
        storageUsedBytes:  est.usage  || null,
        storagePersisted:  await navigator.storage.persisted?.() ?? null,
      };
    }
  } catch {}
  return { storageQuotaBytes: null, storageUsedBytes: null, storagePersisted: null };
}

/* ── Batterie ─────────────────────────────────────────────── */

async function getBatteryInfo() {
  try {
    if (navigator.getBattery) {
      const b = await navigator.getBattery();
      return {
        batteryLevel:    Math.round(b.level * 100),  // 0-100
        batteryCharging: b.charging,
        batteryTimeLeft: b.dischargingTime === Infinity ? null : b.dischargingTime, // secondes
      };
    }
  } catch {}
  return { batteryLevel: null, batteryCharging: null, batteryTimeLeft: null };
}

/* ── Localisation ─────────────────────────────────────────── */

/**
 * Tente GPS d'abord (si permission déjà accordée ou si l'user accepte).
 * Si refus ou timeout → fallback IP via ip-api.com (HTTP, gratuit, ~45 req/min).
 * Retourne toujours un objet même si tout échoue.
 */
async function getLocationInfo() {
  // 1. Essai GPS
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, maximumAge: 300_000 })
    );
    const { latitude, longitude, accuracy, altitude } = pos.coords;

    // Reverse geocoding via Nominatim (même serveur que weather widget)
    let city = null, country = null, countryCode = null, postcode = null, region = null;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const d = await r.json();
      city        = d.address?.city || d.address?.town || d.address?.village || d.address?.county || null;
      region      = d.address?.state || null;
      country     = d.address?.country || null;
      countryCode = d.address?.country_code?.toUpperCase() || null;
      postcode    = d.address?.postcode || null;
    } catch {}

    return {
      source:      'gps',
      latitude,
      longitude,
      accuracyM:   accuracy,
      altitudeM:   altitude,
      city,
      region,
      country,
      countryCode,
      postcode,
    };
  } catch {}

  // 2. Fallback IP (pas de clé requise)
  try {
    const r = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,zip,lat,lon,isp,org,query&lang=fr');
    const d = await r.json();
    if (d.status === 'success') {
      return {
        source:      'ip',
        latitude:    d.lat,
        longitude:   d.lon,
        accuracyM:   null,
        altitudeM:   null,
        city:        d.city        || null,
        region:      d.regionName  || null,
        country:     d.country     || null,
        countryCode: d.countryCode || null,
        postcode:    d.zip         || null,
        isp:         d.isp         || null,
        org:         d.org         || null,
        ip:          d.query       || null,
      };
    }
  } catch {}

  return {
    source: 'none',
    latitude: null, longitude: null, accuracyM: null, altitudeM: null,
    city: null, region: null, country: null, countryCode: null, postcode: null,
  };
}

/* ── Divers ───────────────────────────────────────────────── */

function getMiscInfo() {
  return {
    touchPoints:      navigator.maxTouchPoints || 0,
    pdfViewerEnabled: navigator.pdfViewerEnabled ?? null,
    // Vraisemblance mode incognito : quota storage très bas (< 120 Mo) est un signal fort
    likelyIncognito:  null, // rempli après getStorageInfo
  };
}

/* ── Collecte complète ────────────────────────────────────── */

/**
 * Collecte toutes les données disponibles.
 * @param {object} opts
 * @param {boolean} opts.withLocation  - Demander la géoloc (GPS ou IP)
 * @returns {Promise<object>}
 */
export async function collectDeviceIntel({ withLocation = true } = {}) {
  const ua       = parseUA();
  const screen_  = getScreenInfo();
  const hardware = getHardwareInfo();
  const gpu      = getGPUInfo();
  const network  = getNetworkInfo();
  const prefs    = getSystemPrefs();
  const misc     = getMiscInfo();

  const [storage, battery, location] = await Promise.all([
    getStorageInfo(),
    getBatteryInfo(),
    withLocation ? getLocationInfo() : Promise.resolve({ source: 'disabled' }),
  ]);

  // Heuristique incognito
  let likelyIncognito = null;
  if (storage.storageQuotaBytes !== null) {
    likelyIncognito = storage.storageQuotaBytes < 125 * 1024 * 1024; // < 120 Mo = probable
  }

  return {
    collectedAt: new Date().toISOString(),
    device: {
      type:           getDeviceType(),
      os:             ua.os,
      browser:        ua.browser,
      browserVersion: ua.browserVersion,
      touchPoints:    misc.touchPoints,
    },
    screen: screen_,
    hardware: {
      ...hardware,
      ...gpu,
    },
    network,
    prefs,
    storage: {
      ...storage,
      likelyIncognito,
    },
    battery,
    location,
  };
}

/* ── Collecte rapide (synchro, sans async) ─────────────────── */
// Utile pour envoyer des stats sans attendre les APIs

export function collectDeviceIntelSync() {
  const ua       = parseUA();
  const screen_  = getScreenInfo();
  const hardware = getHardwareInfo();
  const gpu      = getGPUInfo();
  const network  = getNetworkInfo();
  const prefs    = getSystemPrefs();

  return {
    collectedAt: new Date().toISOString(),
    device: {
      type:           getDeviceType(),
      os:             ua.os,
      browser:        ua.browser,
      browserVersion: ua.browserVersion,
      touchPoints:    navigator.maxTouchPoints || 0,
    },
    screen: screen_,
    hardware: { ...hardware, ...gpu },
    network,
    prefs,
  };
}
