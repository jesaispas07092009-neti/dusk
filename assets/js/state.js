/* ═══════════════════════════════════════════════════════════
   DUSK — state.js
   État global observable minimal, enrichi pour l'auth et Supabase
═══════════════════════════════════════════════════════════ */

const _listeners = Object.create(null);

const defaultState = {
  session: null,
  user: {
    id: null,
    email: null,
    profile: null,
    widgetPrefs: [],
    todos: [],
    links: [],
    projects: [],
    moodLog: [],
    mood: null,
    worldmap: [],
  },
  modal: { isOpen: false, widgetId: null },
  widgets: { visible: [] },
  ui: {
    authOpen:    false,
    settingsOpen: false,
    settingsTab: 'profile',
    theme:       'dusk',   // thème actif — synchronisé par theme-engine.js
  },
  time: { current: null },
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultState));
}

function ensurePath(root, parts) {
  let obj = root;
  for (const key of parts) {
    if (obj[key] == null || typeof obj[key] !== 'object') obj[key] = {};
    obj = obj[key];
  }
  return obj;
}

export const state = cloneDefault();

state.get = function get(path) {
  if (!path) return this;
  return path.split('.').reduce((obj, key) => obj?.[key], this);
};

state.set = function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = ensurePath(this, keys);
  target[last] = value;
  this._notify(path, value);
};

state.patch = function patch(path, value) {
  const current = this.get(path);
  if (current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object') {
    this.set(path, { ...current, ...value });
    return;
  }
  this.set(path, value);
};

state.reset = function reset() {
  const fresh = cloneDefault();
  for (const key of Object.keys(fresh)) this[key] = fresh[key];
  this._notify('*', this);
};

state.on = function on(path, callback) {
  if (!_listeners[path]) _listeners[path] = [];
  _listeners[path].push(callback);
  return () => {
    _listeners[path] = (_listeners[path] || []).filter(fn => fn !== callback);
  };
};

state._notify = function _notify(path, value) {
  (_listeners[path] || []).forEach(fn => fn(value));
  const parent = path.split('.').slice(0, -1).join('.');
  if (parent) (_listeners[parent] || []).forEach(fn => fn(this.get(parent)));
  (_listeners['*'] || []).forEach(fn => fn(this));
};
