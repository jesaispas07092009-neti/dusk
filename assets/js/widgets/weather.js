/* ── Widget : Météo (Open-Meteo — sans clé API) ─────────────── */

const WMO_ICONS = {
  0: ['☀️','Ensoleillé'], 1: ['🌤','Peu nuageux'], 2: ['⛅','Partiellement nuageux'],
  3: ['☁️','Couvert'], 45: ['🌫','Brouillard'], 48: ['🌫','Brouillard givrant'],
  51: ['🌦','Bruine légère'], 53: ['🌦','Bruine'], 55: ['🌧','Bruine dense'],
  61: ['🌧','Pluie légère'], 63: ['🌧','Pluie'], 65: ['🌧','Pluie forte'],
  71: ['🌨','Neige légère'], 73: ['🌨','Neige'], 75: ['❄️','Neige forte'],
  80: ['🌦','Averses légères'], 81: ['🌧','Averses'], 82: ['⛈','Averses fortes'],
  95: ['⛈','Orage'], 96: ['⛈','Orage avec grêle'], 99: ['⛈','Orage violent'],
};

function wmoInfo(code) {
  return WMO_ICONS[code] ?? ['🌡','Inconnu'];
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

async function fetchWeather() {
  const pos = await new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
  );
  const { latitude: lat, longitude: lon } = pos.coords;

  const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();
  const city = geoData.address.city || geoData.address.town || geoData.address.village || 'Ma position';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,uv_index`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset`
    + `&timezone=auto&forecast_days=5`;

  const res = await fetch(url);
  const d = await res.json();
  const c = d.current;
  const daily = d.daily;

  const [icon, desc] = wmoInfo(c.weather_code);

  const forecast = daily.time.map((t, i) => {
    const [fi, ] = wmoInfo(daily.weather_code[i]);
    return {
      day: DAYS[new Date(t).getDay()],
      icon: fi,
      high: Math.round(daily.temperature_2m_max[i]),
      low:  Math.round(daily.temperature_2m_min[i]),
    };
  });

  return {
    city,
    temp:     Math.round(c.temperature_2m),
    feels:    Math.round(c.apparent_temperature),
    desc,
    icon,
    humidity: Math.round(c.relative_humidity_2m),
    wind:     Math.round(c.wind_speed_10m),
    uv:       Math.round(c.uv_index),
    sunrise:  fmtTime(daily.sunrise[0]),
    sunset:   fmtTime(daily.sunset[0]),
    forecast,
  };
}

function renderCompact(container, data) {
  container.innerHTML = `
    <div class="wc-center" style="gap:var(--space-1)">
      <div class="weather-main">
        <span class="weather-icon">${data.icon}</span>
        <span class="weather-temp">${data.temp}°</span>
      </div>
      <div class="weather-desc">${data.city} · ${data.desc}</div>
      <div class="wc-muted">Ressenti ${data.feels}°</div>
    </div>`;
}

function renderLoading(container) {
  container.innerHTML = `
    <div class="wc-center" style="gap:var(--space-1)">
      <div class="wc-muted" style="font-size:1.5rem">⏳</div>
      <div class="wc-muted">Chargement météo…</div>
    </div>`;
}

function renderError(container, msg) {
  container.innerHTML = `
    <div class="wc-center" style="gap:var(--space-1)">
      <div style="font-size:1.5rem">🚫</div>
      <div class="wc-muted" style="font-size:0.75rem;text-align:center">${msg}</div>
    </div>`;
}

function renderDetail(container, data) {
  container.innerHTML = `
    <div style="text-align:center;padding:var(--space-6) 0">
      <div style="font-size:4rem;line-height:1">${data.icon}</div>
      <div style="font-family:var(--font-display);font-size:clamp(2.5rem,8vw,5rem);color:var(--color-text);line-height:1;margin-top:var(--space-3)">${data.temp}°C</div>
      <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-muted);letter-spacing:0.1em;margin-top:var(--space-2)">${data.city} · ${data.desc}</div>
    </div>
    <div class="weather-detail-grid">
      <div class="weather-stat"><div class="weather-stat-label">Ressenti</div><div class="weather-stat-value">${data.feels}°C</div></div>
      <div class="weather-stat"><div class="weather-stat-label">Humidité</div><div class="weather-stat-value">${data.humidity}%</div></div>
      <div class="weather-stat"><div class="weather-stat-label">Vent</div><div class="weather-stat-value">${data.wind} km/h</div></div>
      <div class="weather-stat"><div class="weather-stat-label">UV</div><div class="weather-stat-value">${data.uv}/10</div></div>
      <div class="weather-stat"><div class="weather-stat-label">Lever</div><div class="weather-stat-value">${data.sunrise}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">Coucher</div><div class="weather-stat-value">${data.sunset}</div></div>
    </div>
    <div class="weather-forecast">
      ${data.forecast.map(d => `
        <div class="weather-day">
          <div class="weather-day-name">${d.day}</div>
          <div class="weather-day-icon">${d.icon}</div>
          <div class="weather-day-temp">${d.high}° <span style="color:var(--color-text-faint)">${d.low}°</span></div>
        </div>`).join('')}
    </div>`;
}

export const weatherWidget = {
  id:    'weather',
  label: 'Météo',
  size:  'small',

  render(container) {
    renderLoading(container);
    fetchWeather()
      .then(data => renderCompact(container, data))
      .catch(() => renderError(container, 'Localisation refusée ou indisponible'));
  },

  renderDetail(container) {
    renderLoading(container);
    fetchWeather()
      .then(data => renderDetail(container, data))
      .catch(() => renderError(container, 'Impossible de charger la météo.\nVérifie que la localisation est autorisée.'));
  },
};
