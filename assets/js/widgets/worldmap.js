/* ── Widget : Carte du Monde ─────────────────────────────── */
import { state }           from '../state.js';
import { saveWorldMap }    from '../user-data.js';
import { persistMutation } from '../lib/persist.js';
import { esc }             from '../utils/escape.js';

/* ── ISO-alpha2 → ID numérique world-atlas@2 ── */
const ISO_TO_NUM = {
  AF:4,   AL:8,   DZ:12,  AS:16,  AD:20,  AO:24,  AG:28,  AR:32,
  AM:51,  AU:36,  AT:40,  AZ:31,  BS:44,  BH:48,  BD:50,  BB:52,
  BY:112, BE:56,  BZ:84,  BJ:204, BT:64,  BO:68,  BA:70,  BW:72,
  BR:76,  BN:96,  BG:100, BF:854, BI:108, KH:116, CM:120, CA:124,
  CF:140, TD:148, CL:152, CN:156, CO:170, KM:174, CG:178, CD:180,
  CR:188, CI:384, HR:191, CU:192, CY:196, CZ:203, DK:208, DJ:262,
  DM:212, DO:214, EC:218, EG:818, SV:222, GQ:226, ER:232, EE:233,
  SZ:748, ET:231, FJ:242, FI:246, FR:250, GA:266, GM:270, GE:268,
  DE:276, GH:288, GR:300, GL:304, GD:308, GT:320, GN:324, GW:624,
  GY:328, HT:332, HN:340, HU:348, IS:352, IN:356, ID:360, IR:364,
  IQ:368, IE:372, IL:376, IT:380, JM:388, JP:392, JO:400, KZ:398,
  KE:404, KI:296, KP:408, KR:410, KW:414, KG:417, LA:418, LV:428,
  LB:422, LS:426, LR:430, LY:434, LI:438, LT:440, LU:442, MG:450,
  MW:454, MY:458, MV:462, ML:466, MT:470, MR:478, MU:480, MX:484,
  MD:498, MC:492, MN:496, ME:499, MA:504, MZ:508, MM:104, NA:516,
  NP:524, NL:528, NZ:554, NI:558, NE:562, NG:566, NO:578, OM:512,
  PK:586, PA:591, PG:598, PY:600, PE:604, PH:608, PL:616, PT:620,
  QA:634, RO:642, RU:643, RW:646, KN:659, LC:662, VC:670, WS:882,
  SM:674, ST:678, SA:682, SN:686, RS:688, SC:690, SL:694, SG:702,
  SK:703, SI:705, SB:90,  SO:706, ZA:710, SS:728, ES:724, LK:144,
  SD:729, SR:740, SE:752, CH:756, SY:760, TW:158, TJ:762, TZ:834,
  TH:764, TL:626, TG:768, TO:776, TT:780, TN:788, TR:792, TM:795,
  UG:800, UA:804, AE:784, GB:826, US:840, UY:858, UZ:860, VU:548,
  VE:862, VN:704, YE:887, ZM:894, ZW:716, MK:807, NR:520, TV:798,
  PW:585, FM:583, MH:584, CV:132, NC:540, PF:258, GF:254,
  MQ:474, GP:312, RE:638, PR:630, GU:316, MP:580,
};

const NUM_TO_ISO = Object.fromEntries(
  Object.entries(ISO_TO_NUM).map(([k, v]) => [v, k])
);

const COUNTRY_NAMES = {
  AF:'Afghanistan',    AL:'Albanie',         DZ:'Algérie',
  AD:'Andorre',        AO:'Angola',          AG:'Antigua-et-Barbuda',
  AR:'Argentine',      AM:'Arménie',         AU:'Australie',
  AT:'Autriche',       AZ:'Azerbaïdjan',     BS:'Bahamas',
  BH:'Bahreïn',        BD:'Bangladesh',      BB:'Barbade',
  BY:'Biélorussie',    BE:'Belgique',        BZ:'Belize',
  BJ:'Bénin',          BT:'Bhoutan',         BO:'Bolivie',
  BA:'Bosnie-Herzégovine', BW:'Botswana',    BR:'Brésil',
  BN:'Brunei',         BG:'Bulgarie',        BF:'Burkina Faso',
  BI:'Burundi',        KH:'Cambodge',        CM:'Cameroun',
  CA:'Canada',         CV:'Cap-Vert',        CF:'Rép. Centrafricaine',
  CL:'Chili',          CN:'Chine',           CY:'Chypre',
  CO:'Colombie',       KM:'Comores',         CG:'Congo',
  CD:'RD Congo',       KR:'Corée du Sud',    KP:'Corée du Nord',
  CR:'Costa Rica',     CI:"Côte d'Ivoire",   HR:'Croatie',
  CU:'Cuba',           DK:'Danemark',        DJ:'Djibouti',
  DM:'Dominique',      DO:'Rép. Dominicaine',EC:'Équateur',
  EG:'Égypte',         SV:'Salvador',        AE:'Émirats Arabes Unis',
  ER:'Érythrée',       ES:'Espagne',         EE:'Estonie',
  SZ:'Eswatini',       ET:'Éthiopie',        FJ:'Fidji',
  FI:'Finlande',       FR:'France',          GA:'Gabon',
  GM:'Gambie',         GE:'Géorgie',         GH:'Ghana',
  GR:'Grèce',          GD:'Grenade',         GL:'Groenland',
  GT:'Guatemala',      GN:'Guinée',          GQ:'Guinée équatoriale',
  GW:'Guinée-Bissau',  GY:'Guyane',          HT:'Haïti',
  HN:'Honduras',       HU:'Hongrie',         IN:'Inde',
  ID:'Indonésie',      IQ:'Irak',            IR:'Iran',
  IE:'Irlande',        IS:'Islande',         IL:'Israël',
  IT:'Italie',         JM:'Jamaïque',        JP:'Japon',
  JO:'Jordanie',       KZ:'Kazakhstan',      KE:'Kenya',
  KG:'Kirghizistan',   KW:'Koweït',          LA:'Laos',
  LS:'Lesotho',        LV:'Lettonie',        LB:'Liban',
  LR:'Libéria',        LY:'Libye',           LI:'Liechtenstein',
  LT:'Lituanie',       LU:'Luxembourg',      MK:'Macédoine du Nord',
  MG:'Madagascar',     MY:'Malaisie',        MW:'Malawi',
  MV:'Maldives',       ML:'Mali',            MT:'Malte',
  MA:'Maroc',          MR:'Mauritanie',      MU:'Maurice',
  MX:'Mexique',        MD:'Moldavie',        MC:'Monaco',
  MN:'Mongolie',       ME:'Monténégro',      MZ:'Mozambique',
  MM:'Myanmar',        NA:'Namibie',         NP:'Népal',
  NI:'Nicaragua',      NE:'Niger',           NG:'Nigéria',
  NO:'Norvège',        NZ:'Nouvelle-Zélande',OM:'Oman',
  UG:'Ouganda',        UZ:'Ouzbékistan',     PK:'Pakistan',
  PW:'Palaos',         PA:'Panama',          PG:'Papouasie-Nvl-Guinée',
  PY:'Paraguay',       NL:'Pays-Bas',        PE:'Pérou',
  PH:'Philippines',    PL:'Pologne',         PT:'Portugal',
  QA:'Qatar',          RO:'Roumanie',        GB:'Royaume-Uni',
  RU:'Russie',         RW:'Rwanda',          LC:'Sainte-Lucie',
  KN:'Saint-Kitts',    VC:'Saint-Vincent',   WS:'Samoa',
  SM:'Saint-Marin',    ST:'São Tomé-et-Príncipe',
  SA:'Arabie Saoudite',SN:'Sénégal',         RS:'Serbie',
  SC:'Seychelles',     SL:'Sierra Leone',    SG:'Singapour',
  SK:'Slovaquie',      SI:'Slovénie',        SO:'Somalie',
  SD:'Soudan',         SS:'Soudan du Sud',   LK:'Sri Lanka',
  SR:'Suriname',       SE:'Suède',           CH:'Suisse',
  SY:'Syrie',          TJ:'Tadjikistan',     TW:'Taïwan',
  TZ:'Tanzanie',       TD:'Tchad',           CZ:'Tchéquie',
  TH:'Thaïlande',      TL:'Timor-Leste',     TG:'Togo',
  TO:'Tonga',          TT:'Trinité-et-Tobago',TN:'Tunisie',
  TM:'Turkménistan',   TR:'Turquie',         UA:'Ukraine',
  UY:'Uruguay',        VU:'Vanuatu',         VE:'Venezuela',
  VN:'Vietnam',        YE:'Yémen',           ZM:'Zambie',
  ZW:'Zimbabwe',       NR:'Nauru',           TV:'Tuvalu',
  FM:'Micronésie',     MH:'Îles Marshall',   SB:'Îles Salomon',
  KI:'Kiribati',       NC:'Nouvelle-Calédonie',
};

function countryName(iso) { return COUNTRY_NAMES[iso] || iso; }
function getVisited()     { return state.get('user.worldmap') || []; }

/* ── Vue compacte ── */
function renderCompact(container) {
  const count = getVisited().length;
  container.innerHTML = `
    <div class="wc-center" style="flex-direction:column;gap:var(--space-3)">
      <svg viewBox="0 0 80 80" width="60" height="60">
        <circle cx="40" cy="40" r="35"
          fill="var(--color-surface-2)" stroke="var(--color-border-warm)" stroke-width="1"/>
        <ellipse cx="40" cy="40" rx="13" ry="35"
          fill="none" stroke="var(--color-border)" stroke-width="0.7"/>
        <ellipse cx="40" cy="40" rx="26" ry="35"
          fill="none" stroke="var(--color-border)" stroke-width="0.7"/>
        <line x1="5" y1="40" x2="75" y2="40" stroke="var(--color-border)" stroke-width="0.7"/>
        <line x1="9" y1="27" x2="71" y2="27" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 2"/>
        <line x1="9" y1="53" x2="71" y2="53" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 2"/>
        ${count > 0 ? `<circle cx="40" cy="40" r="5" fill="var(--color-accent)" opacity="0.75"/>` : ''}
      </svg>
      <div style="font-family:var(--font-display);font-size:var(--text-2xl);color:var(--color-text);line-height:1">${count}</div>
      <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)">
        pays visité${count !== 1 ? 's' : ''}
      </div>
    </div>`;
}

/* ── Vue détail — SYNCHRONE (exigé par modal.js) ── */
function renderDetail(container) {
  container.innerHTML = `
    <div id="wm-root" style="display:flex;flex-direction:column;height:100%;min-height:420px">
      <div style="display:flex;align-items:center;justify-content:space-between;
        margin-bottom:var(--space-4);flex-shrink:0;gap:var(--space-3)">
        <div>
          <span id="wm-count" style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--color-text)">—</span>
          <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint);margin-left:var(--space-2)">pays visités</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3)">
          <span id="wm-status" style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text-faint)"></span>
          <button id="wm-reset" style="padding:var(--space-1) var(--space-3);
            background:var(--color-surface-2);border:1px solid var(--color-border);
            border-radius:var(--radius-sm);color:var(--color-text-muted);
            font-family:var(--font-mono);font-size:var(--text-xs);cursor:pointer">↺ Reset vue</button>
        </div>
      </div>

      <div style="position:relative;flex:1;min-height:280px;
        border-radius:var(--radius-sm);overflow:hidden;
        background:var(--color-surface-2);border:1px solid var(--color-border)">
        <canvas id="wm-canvas" style="display:block;width:100%;height:100%;cursor:crosshair"></canvas>
        <div id="wm-loader" style="position:absolute;inset:0;display:flex;align-items:center;
          justify-content:center;font-family:var(--font-mono);font-size:var(--text-xs);
          color:var(--color-text-faint);background:var(--color-surface-2)">
          Chargement de la carte…
        </div>
        <div id="wm-tooltip" style="position:absolute;pointer-events:none;opacity:0;
          background:var(--color-surface-3);border:1px solid var(--color-border-warm);
          border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);
          font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-text);
          white-space:nowrap;z-index:10;box-shadow:0 4px 16px rgba(0,0,0,0.4);
          transition:opacity 0.12s"></div>
      </div>

      <div style="margin-top:var(--space-3);flex-shrink:0">
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);
          color:var(--color-text-faint);margin-bottom:var(--space-2)">
          Clic pour marquer · Scroll pour zoomer · Glisser pour déplacer
        </div>
        <div id="wm-list" style="display:flex;flex-wrap:wrap;gap:var(--space-1);max-height:76px;overflow-y:auto"></div>
      </div>
    </div>`;

  /* Lance le chargement async APRÈS que le DOM est monté */
  initMap(container);
  return null; /* modal.js attend null ou une fn de cleanup */
}

/* ── Initialisation async ── */
async function initMap(container) {
  const canvas   = container.querySelector('#wm-canvas');
  const loader   = container.querySelector('#wm-loader');
  const tooltip  = container.querySelector('#wm-tooltip');
  const countEl  = container.querySelector('#wm-count');
  const statusEl = container.querySelector('#wm-status');
  const listEl   = container.querySelector('#wm-list');
  if (!canvas) return;

  let d3geo, topojson, world;
  try {
    [d3geo, topojson, world] = await Promise.all([
      import('https://cdn.jsdelivr.net/npm/d3-geo@3/+esm'),
      import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'),
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r => r.json()),
    ]);
  } catch {
    if (loader) { loader.textContent = 'Impossible de charger la carte (réseau requis).'; loader.style.color = '#c84a4a'; }
    return;
  }

  if (!canvas.isConnected) return;
  if (loader) loader.style.display = 'none';

  /* ── État ── */
  let visited    = [...getVisited()];
  let hoveredId  = null;
  let isDragging = false;
  let dragStart  = null;
  let panStart   = null;
  let transform  = { x: 0, y: 0, k: 1 };
  let statusTimer = null;

  const countries  = topojson.feature(world, world.objects.countries);
  const projection = d3geo.geoNaturalEarth1();
  const pathGen    = d3geo.geoPath().projection(projection);
  const sphere     = { type: 'Sphere' };
  const ctx        = canvas.getContext('2d');
  let W = 0, H = 0;

  /* ── Resize ── */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = rect.height;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    projection.fitSize([W, H], sphere);
    draw();
  }
  const ro = new ResizeObserver(() => { if (canvas.isConnected) resize(); });
  ro.observe(canvas);

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  /* ── Dessin ── */
  function draw() {
    if (!W || !H) return;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const visitedSet = new Set(visited);
    const colOcean   = cssVar('--color-surface-2') || '#201d1a';
    const colLand    = cssVar('--color-surface-3') || '#2a2622';
    const colBorder  = cssVar('--color-border')    || 'rgba(255,255,255,0.06)';
    const colAccent  = cssVar('--color-accent')    || '#c8813c';

    ctx.beginPath(); pathGen.context(ctx)(sphere);
    ctx.fillStyle = colOcean; ctx.fill();

    for (const f of countries.features) {
      const numId     = Number(f.id);
      const iso       = NUM_TO_ISO[numId];
      const isVisited = iso && visitedSet.has(iso);
      const isHovered = numId === hoveredId;
      ctx.beginPath(); pathGen.context(ctx)(f);
      ctx.fillStyle   = isVisited ? (isHovered ? colAccent : colAccent + 'aa') : (isHovered ? '#35302b' : colLand);
      ctx.fill();
      ctx.strokeStyle = colBorder; ctx.lineWidth = 0.5 / transform.k; ctx.stroke();
    }

    ctx.beginPath(); pathGen.context(ctx)(sphere);
    ctx.strokeStyle = colBorder; ctx.lineWidth = 1 / transform.k; ctx.stroke();
    ctx.restore();
  }

  /* ── Hit test via projection.invert() + d3.geoContains() ──
     On convertit le pixel CSS cliqué en [lon, lat] via l'inverse de la
     projection (en tenant compte du pan/zoom), puis on teste géographiquement
     quel pays contient ce point. Aucun problème de DPR, aucun canvas offscreen. */
  function getFeatureAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    // coordonnées CSS → espace projection (annule pan+zoom)
    const px = (clientX - rect.left - transform.x) / transform.k;
    const py = (clientY - rect.top  - transform.y) / transform.k;
    // projection.invert : pixels CSS → [longitude, latitude]
    const lonLat = projection.invert([px, py]);
    if (!lonLat) return null;

    for (const f of countries.features) {
      if (d3geo.geoContains(f, lonLat)) return f;
    }
    return null;
  }

  /* ── UI helpers ── */
  function showTooltip(x, y, text) {
    if (!tooltip) return;
    tooltip.textContent = text;
    tooltip.style.left = (x + 14) + 'px';
    tooltip.style.top  = (y - 10) + 'px';
    tooltip.style.opacity = '1';
  }
  function hideTooltip() { if (tooltip) tooltip.style.opacity = '0'; }

  function setStatus(msg, error = false, autoClear = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = error ? '#c84a4a' : 'var(--color-text-faint)';
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
    if (autoClear && msg) {
      statusTimer = setTimeout(() => { if (statusEl.isConnected) statusEl.textContent = ''; }, 2200);
    }
  }

  function updateList() {
    if (countEl) countEl.textContent = visited.length;
    if (!listEl) return;
    listEl.innerHTML = visited.map(iso => `
      <span data-rm="${esc(iso)}" style="display:inline-flex;align-items:center;gap:3px;
        padding:2px 8px 2px 10px;border-radius:999px;cursor:pointer;
        background:var(--color-accent-dim);border:1px solid var(--color-border-warm);
        font-family:var(--font-mono);font-size:10px;color:var(--color-accent-light)">
        ${esc(countryName(iso))}<span style="opacity:0.5">×</span>
      </span>`).join('');
    listEl.querySelectorAll('[data-rm]').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); toggleCountry(el.dataset.rm, false); });
    });
  }

  /* ── Toggle pays ── */
  async function toggleCountry(iso, forceAdd = null) {
    const nowVisited = forceAdd !== null ? forceAdd : !visited.includes(iso);
    const snapshot   = [...visited];

    if (nowVisited) { if (!visited.includes(iso)) visited.push(iso); }
    else            { visited = visited.filter(v => v !== iso); }

    state.set('user.worldmap', [...visited]);
    setStatus('Sauvegarde…');
    draw(); updateList();

    try {
      await persistMutation({
        action:   () => saveWorldMap(state.get('user.id'), [...visited]),
        rollback: () => { visited = snapshot; state.set('user.worldmap', [...snapshot]); },
        errorMessage: 'Impossible de sauvegarder la carte.',
      });
      setStatus(nowVisited ? `✓ ${countryName(iso)} ajouté` : `${countryName(iso)} retiré`, false, true);
      draw(); updateList();
    } catch {
      setStatus('Erreur de sauvegarde', true);
      draw(); updateList();
    }
  }

  /* ── Événements ── */
  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      transform.x = panStart.x + (e.clientX - dragStart.x);
      transform.y = panStart.y + (e.clientY - dragStart.y);
      hideTooltip(); draw(); return;
    }
    const f     = getFeatureAt(e.clientX, e.clientY);
    const numId = f ? Number(f.id) : null;
    if (numId !== hoveredId) { hoveredId = numId; draw(); }
    if (f) {
      const iso  = NUM_TO_ISO[Number(f.id)];
      const rect = canvas.getBoundingClientRect();
      showTooltip(e.clientX - rect.left, e.clientY - rect.top,
        `${iso ? countryName(iso) : '—'}${iso && visited.includes(iso) ? ' ✓' : ''}`);
      canvas.style.cursor = 'pointer';
    } else { hideTooltip(); canvas.style.cursor = 'crosshair'; }
  });

  canvas.addEventListener('mouseleave', () => { hoveredId = null; isDragging = false; hideTooltip(); draw(); });

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart  = { x: e.clientX, y: e.clientY };
    panStart   = { x: transform.x, y: transform.y };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mouseup', async e => {
    const moved = dragStart ? Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 4 : false;
    isDragging = false; canvas.style.cursor = 'crosshair';
    if (moved) return;
    const f   = getFeatureAt(e.clientX, e.clientY);
    const iso = f ? NUM_TO_ISO[Number(f.id)] : null;
    if (iso) await toggleCountry(iso);
  });

  /* Touch */
  let touchRef = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1)
      touchRef = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: transform.x, py: transform.y };
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && touchRef) {
      transform.x = touchRef.px + e.touches[0].clientX - touchRef.x;
      transform.y = touchRef.py + e.touches[0].clientY - touchRef.y;
      draw();
    }
  }, { passive: true });
  canvas.addEventListener('touchend', async e => {
    const t = e.changedTouches[0];
    const moved = touchRef ? Math.hypot(t.clientX - touchRef.x, t.clientY - touchRef.y) > 6 : false;
    touchRef = null; if (moved) return;
    const f   = getFeatureAt(t.clientX, t.clientY);
    const iso = f ? NUM_TO_ISO[Number(f.id)] : null;
    if (iso) await toggleCountry(iso);
  }, { passive: true });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect   = canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newK   = Math.min(Math.max(transform.k * factor, 0.5), 14);
    transform.x  = mx - (mx - transform.x) * (newK / transform.k);
    transform.y  = my - (my - transform.y) * (newK / transform.k);
    transform.k  = newK; draw();
  }, { passive: false });

  container.querySelector('#wm-reset')?.addEventListener('click', () => {
    transform = { x: 0, y: 0, k: 1 };
    projection.fitSize([W, H], sphere); draw();
  });

  updateList();
}

/* ── Export ── */
export const worldmapWidget = {
  id:    'worldmap',
  label: 'Carte du monde',
  size:  'small',
  render(container)       { renderCompact(container); },
  renderDetail(container) { return renderDetail(container); },
};
