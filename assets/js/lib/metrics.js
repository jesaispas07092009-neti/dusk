import { state } from '../state.js';

const SESSION_STORAGE_KEY = 'dusk-session-start-at';
let fallbackSessionStart = Date.now();

function safeSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readStoredStart() {
  const storage = safeSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredStart(value) {
  const storage = safeSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(SESSION_STORAGE_KEY, String(value));
  } catch {}
}

export function getSessionStartAt() {
  const stored = readStoredStart();
  if (stored) return stored;

  const now = Date.now();
  const start = fallbackSessionStart || now;
  fallbackSessionStart = start;
  writeStoredStart(start);
  return start;
}

export function resetSessionStartAt(timestamp = Date.now()) {
  fallbackSessionStart = toPositiveNumber(timestamp) || Date.now();
  writeStoredStart(fallbackSessionStart);
}

export function getSessionDurationMs(now = Date.now()) {
  return Math.max(0, now - getSessionStartAt());
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}j ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${Math.max(1, seconds)}s`;
}

export function formatBytes(bytes) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024) return `${n} o`;

  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0).replace('.', ',')} Ko`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} Mo`;

  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 1 : 0).replace('.', ',')} Go`;
}

export function percentOf(part, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function getWidgetMetrics({ widgetPrefs = null, visibleWidgets = null } = {}) {
  const prefs = Array.isArray(widgetPrefs) ? widgetPrefs : (state.get('user.widgetPrefs') || []);
  const visible = Array.isArray(visibleWidgets) ? visibleWidgets : (state.get('widgets.visible') || []);

  const enabledCount = prefs.filter(pref => pref?.enabled !== false).length;
  const visibleUnique = [...new Set(visible.filter(Boolean))].length;

  const total = prefs.length || visibleUnique || enabledCount;
  const active = prefs.length ? enabledCount : visibleUnique || enabledCount;
  const hidden = Math.max(0, total - active);

  return {
    total,
    active,
    hidden,
    percent: percentOf(active, total),
  };
}

export function getTodoMetrics(todos = null) {
  const list = Array.isArray(todos) ? todos : (state.get('user.todos') || []);
  const total = list.length;
  const done = list.filter(todo => Boolean(todo?.done)).length;
  const remaining = Math.max(0, total - done);

  return {
    total,
    done,
    remaining,
    percent: percentOf(done, total),
  };
}

export function getProjectMetrics(projects = null) {
  const list = Array.isArray(projects) ? projects : (state.get('user.projects') || []);
  const total = list.length;
  const active = list.filter(project => String(project?.status || '').toLowerCase() !== 'terminé').length;
  const completed = Math.max(0, total - active);
  const paused = list.filter(project => String(project?.status || '').toLowerCase() === 'en pause').length;

  return {
    total,
    active,
    completed,
    paused,
    percent: percentOf(active, total),
  };
}

export function getStorageMetrics(prefix = 'dusk-v2') {
  if (typeof localStorage === 'undefined') {
    return { bytes: 0, label: '0 o' };
  }

  let bytes = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    try {
      const value = localStorage.getItem(key) || '';
      bytes += key.length * 2;
      bytes += value.length * 2;
    } catch {
      // ignore storage read errors
    }
  }

  return {
    bytes,
    label: formatBytes(bytes),
  };
}

export function getConnectivityMetrics() {
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  const source = state.get('session') ? 'Supabase' : 'Local';
  return {
    online,
    source,
    label: online ? 'En ligne' : 'Hors ligne',
  };
}

export function buildProfileStats({ todos = null, projects = null, widgetPrefs = null, visibleWidgets = null } = {}) {
  const widgets = getWidgetMetrics({ widgetPrefs, visibleWidgets });
  const todoMetrics = getTodoMetrics(todos);
  const projectMetrics = getProjectMetrics(projects);

  return [
    {
      label: 'Widgets',
      value: widgets.total ? `${widgets.active}/${widgets.total} actifs` : '0',
    },
    {
      label: 'Todos',
      value: todoMetrics.total ? `${todoMetrics.done}/${todoMetrics.total} terminées` : '0',
    },
    {
      label: 'Projets',
      value: projectMetrics.total ? `${projectMetrics.active}/${projectMetrics.total} actifs` : '0',
    },
  ];
}

export function buildActivitySnapshot({ todos = null, projects = null, widgetPrefs = null, visibleWidgets = null, storagePrefix = 'dusk-v2', now = Date.now() } = {}) {
  const widgets = getWidgetMetrics({ widgetPrefs, visibleWidgets });
  const todoMetrics = getTodoMetrics(todos);
  const projectMetrics = getProjectMetrics(projects);
  const storage = getStorageMetrics(storagePrefix);
  const connectivity = getConnectivityMetrics();
  const sessionMs = getSessionDurationMs(now);

  return {
    widgets,
    todos: todoMetrics,
    projects: projectMetrics,
    storage,
    connectivity,
    sessionMs,
    sessionLabel: formatDuration(sessionMs),
  };
}

export function buildActivityRows(context = {}) {
  const snapshot = buildActivitySnapshot(context);

  return [
    {
      label: 'Widgets actifs',
      value: snapshot.widgets.total ? `${snapshot.widgets.active}/${snapshot.widgets.total}` : '0',
      percent: snapshot.widgets.percent,
      note: snapshot.widgets.total ? `${snapshot.widgets.hidden} masqués` : 'Aucun widget',
    },
    {
      label: 'Todos complétées',
      value: snapshot.todos.total ? `${snapshot.todos.done}/${snapshot.todos.total}` : '0',
      percent: snapshot.todos.percent,
      note: snapshot.todos.total ? `${snapshot.todos.remaining} restantes` : 'Aucune tâche',
    },
    {
      label: 'Projets actifs',
      value: snapshot.projects.total ? `${snapshot.projects.active}/${snapshot.projects.total}` : '0',
      percent: snapshot.projects.percent,
      note: snapshot.projects.total ? `${snapshot.projects.completed} terminés` : 'Aucun projet',
    },
  ];
}
