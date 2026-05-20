import { supabase, isSupabaseConfigured } from './supabase.js';
import { state } from './state.js';
import { buildProfileStats } from './lib/metrics.js';

const STORAGE_PREFIX = 'dusk-v2';

const DEFAULT_PROFILE = {
  initials: 'DK',
  name: 'Dusk',
  role: 'Explorateur nocturne',
  bio: "Passionné par les interfaces belles et les expériences numériques qui ont de l'âme. Je construis des choses la nuit.",
  tags: ['Design', 'Code', 'Photographie', 'Musique', 'Architecture'],
  stats: [],
  theme: 'dusk',   // thème persisté dans le profil
};

const DEFAULT_LINKS = [
  { label: 'GitHub', emoji: '🐙', url: 'https://github.com', position: 0 },
  { label: 'Dribbble', emoji: '🏀', url: 'https://dribbble.com', position: 1 },
  { label: 'Portfolio', emoji: '🌐', url: '#', position: 2 },
  { label: 'Twitter/X', emoji: '𝕏', url: 'https://x.com', position: 3 },
  { label: 'Linear', emoji: '📐', url: 'https://linear.app', position: 4 },
  { label: 'Notion', emoji: '📓', url: 'https://notion.so', position: 5 },
];

const DEFAULT_PROJECTS = [
  { name: 'Dusk', description: 'Dashboard personnel immersif', status: 'actif', color: '#c8813c', position: 0 },
  { name: 'Nocturne', description: 'App de journaling nocturne', status: 'en pause', color: '#4a7ab5', position: 1 },
  { name: 'Ombra', description: 'Système de design sombre', status: 'concept', color: '#8b5cf6', position: 2 },
  { name: 'Solstice', description: 'Calendrier lunaire interactif', status: 'terminé', color: '#4a8f7a', position: 3 },
  { name: 'Vesper', description: 'Player audio minimaliste', status: 'idée', color: '#7a7067', position: 4 },
];

const DEFAULT_WIDGET_IDS = [
  'clock', 'weather', 'quote', 'todo', 'moon', 'word', 'snake', 'compliment',
  'timer', 'memory', 'profile', 'sunrise', 'calendar', 'quiz', 'tictactoe',
  'game2048', 'reflex', 'world-clock', 'links', 'stats', 'projects', 'mood',
  'radio', 'secret', 'mystery',
];

function storageKey(name, userId = 'anon') {
  return `${STORAGE_PREFIX}:${name}:${userId}`;
}

function readLocal(name, userId = 'anon', fallback) {
  try {
    const raw = localStorage.getItem(storageKey(name, userId));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(name, userId = 'anon', value) {
  try {
    localStorage.setItem(storageKey(name, userId), JSON.stringify(value));
  } catch {}
}

function isUuidLike(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeProfile(profile, fallbackUserId = null, email = null) {
  if (!profile) {
    return {
      id: fallbackUserId,
      email,
      ...DEFAULT_PROFILE,
    };
  }

  return {
    ...DEFAULT_PROFILE,
    ...profile,
    tags:  Array.isArray(profile.tags)  ? profile.tags  : DEFAULT_PROFILE.tags,
    stats: Array.isArray(profile.stats) ? profile.stats : DEFAULT_PROFILE.stats,
    theme: profile.theme || DEFAULT_PROFILE.theme,
  };
}

function normalizeProject(project, position = 0, userId = null) {
  return {
    id:          project.id ?? `${userId}:project:${position}`,
    user_id:     project.user_id ?? userId,
    name:        project.name ?? '',
    description: project.description ?? project.desc ?? '',
    status:      project.status ?? 'concept',
    color:       project.color ?? '#c8813c',
    position:    Number.isFinite(project.position) ? project.position : position,
  };
}

function buildDefaultWidgetPrefs(userId) {
  return DEFAULT_WIDGET_IDS.map((widget_id, position) => ({
    id:       `${userId}:${widget_id}`,
    user_id:  userId,
    widget_id,
    enabled:  true,
    position,
  }));
}

function persistFallbackState({ profile, todos, links, projects, widgetPrefs, moodLog } = {}, userId = 'anon') {
  if (profile)     writeLocal('profile',      userId, profile);
  if (todos)       writeLocal('todos',         userId, todos);
  if (links)       writeLocal('links',         userId, links);
  if (projects)    writeLocal('projects',      userId, projects);
  if (widgetPrefs) writeLocal('widget-prefs',  userId, widgetPrefs);
  if (moodLog)     writeLocal('mood-log',      userId, moodLog);
}

function withDerivedProfileStats(profile, { todos = [], projects = [], widgetPrefs = [], visibleWidgets = [] } = {}) {
  return {
    ...profile,
    stats: buildProfileStats({
      todos,
      projects,
      widgetPrefs,
      visibleWidgets,
    }),
  };
}

export async function loadDashboardData({ userId = null, email = null } = {}) {
  const storageUserId = userId || 'anon';

  if (!isSupabaseConfigured || !supabase || !userId) {
    let profile = normalizeProfile(readLocal('profile', storageUserId, null), userId, email);
    const todos = readLocal('todos', storageUserId, []);
    const links = (readLocal('links', storageUserId, DEFAULT_LINKS) || []).map((link, position) => ({
      ...link,
      position: link.position ?? position,
    }));
    const projects = (readLocal('projects', storageUserId, DEFAULT_PROJECTS) || []).map((project, position) =>
      normalizeProject(project, position, storageUserId)
    );
    const widgetPrefs = readLocal('widget-prefs', storageUserId, buildDefaultWidgetPrefs(storageUserId));
    const moodLog     = readLocal('mood-log', storageUserId, []);
    profile = withDerivedProfileStats(profile, { todos, projects, widgetPrefs });
    return { profile, todos, links, projects, widgetPrefs, moodLog, mood: moodLog[0] || null };
  }

  const [profileRes, prefsRes, todosRes, linksRes, projectsRes, moodRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('widget_prefs').select('*').eq('user_id', userId).order('position', { ascending: true }),
    supabase.from('todos').select('*').eq('user_id', userId).order('position', { ascending: true }),
    supabase.from('links').select('*').eq('user_id', userId).order('position', { ascending: true }),
    supabase.from('projects').select('*').eq('user_id', userId).order('position', { ascending: true }),
    supabase.from('mood_log').select('*').eq('user_id', userId).order('logged_at', { ascending: false }).limit(20),
  ]);

  const profile = normalizeProfile(profileRes.data, userId, email);

  const widgetPrefs = (prefsRes.data && prefsRes.data.length ? prefsRes.data : buildDefaultWidgetPrefs(userId)).map((pref, index) => ({
    ...pref,
    position: Number.isFinite(pref.position) ? pref.position : index,
  }));

  const todos = (todosRes.data || []).map(todo => ({ ...todo }));

  const links = (linksRes.data && linksRes.data.length ? linksRes.data : DEFAULT_LINKS.map((link, position) => ({
    id: `${userId}:link:${position}`,
    user_id: userId,
    ...link,
  }))).map((link, position) => ({
    ...link,
    position: link.position ?? position,
  }));

  const projects = (projectsRes.data && projectsRes.data.length ? projectsRes.data : DEFAULT_PROJECTS.map((project, position) => ({
    id: `${userId}:project:${position}`,
    user_id: userId,
    ...project,
  }))).map((project, position) => normalizeProject(project, position, userId));

  const moodLog = (moodRes.data || []).map(entry => ({ ...entry }));

  const derivedProfile = withDerivedProfileStats(profile, { todos, projects, widgetPrefs });

  return { profile: derivedProfile, todos, links, projects, widgetPrefs, moodLog, mood: moodLog[0] || null };
}

export async function saveProfile(userId, patch) {
  const current = state.get('user.profile') || {};
  const next = withDerivedProfileStats(
    normalizeProfile({ ...current, ...patch }, userId, state.get('user.email')),
    {
      todos:          state.get('user.todos')       || [],
      projects:       state.get('user.projects')    || [],
      widgetPrefs:    state.get('user.widgetPrefs') || [],
      visibleWidgets: state.get('widgets.visible')  || [],
    }
  );

  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ profile: next }, userId || 'anon');
    return next;
  }

  const payload = {
    id:       userId,
    name:     next.name,
    initials: next.initials,
    role:     next.role,
    bio:      next.bio,
    tags:     next.tags,
    stats:    next.stats,
    theme:    next.theme || 'dusk',   // ← persiste le thème dans Supabase
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return next;
}

export async function saveWidgetPrefs(userId, prefs) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ widgetPrefs: prefs }, userId || 'anon');
    return prefs;
  }

  const rows = prefs.map(pref => ({
    user_id:   userId,
    widget_id: pref.widget_id,
    enabled:   Boolean(pref.enabled),
    position:  Number(pref.position) || 0,
  }));

  const { error } = await supabase.from('widget_prefs').upsert(rows, { onConflict: 'user_id,widget_id' });
  if (error) throw error;
  return prefs;
}

export async function saveTodos(userId, todos) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ todos }, userId || 'anon');
    return todos;
  }

  const rows = todos.map((todo, index) => ({
    id:       isUuidLike(todo.id) ? todo.id : undefined,
    user_id:  userId,
    text:     todo.text,
    done:     Boolean(todo.done),
    position: Number.isFinite(todo.position) ? todo.position : index,
  }));

  const { error } = await supabase.from('todos').upsert(rows);
  if (error) throw error;
  return todos;
}

export async function saveLinks(userId, links) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ links }, userId || 'anon');
    return links;
  }

  const rows = links.map((link, index) => ({
    id:       isUuidLike(link.id) ? link.id : undefined,
    user_id:  userId,
    label:    link.label,
    emoji:    link.emoji,
    url:      link.url,
    position: Number.isFinite(link.position) ? link.position : index,
  }));

  const { error } = await supabase.from('links').upsert(rows);
  if (error) throw error;
  return links;
}

export async function saveProjects(userId, projects) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ projects }, userId || 'anon');
    return projects;
  }

  const rows = projects.map((project, index) => ({
    id:          isUuidLike(project.id) ? project.id : undefined,
    user_id:     userId,
    name:        project.name,
    description: project.description ?? project.desc ?? '',
    status:      project.status,
    color:       project.color,
    position:    Number.isFinite(project.position) ? project.position : index,
  }));

  const { error } = await supabase.from('projects').upsert(rows);
  if (error) throw error;
  return projects;
}

export async function deleteProject(userId, projectId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const projects = readLocal('projects', userId || 'anon', []).filter(project => project.id !== projectId);
    persistFallbackState({ projects }, userId || 'anon');
    return projects;
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function saveMood(userId, moodEntry) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const moodLog = [moodEntry, ...readLocal('mood-log', userId || 'anon', [])].slice(0, 20);
    persistFallbackState({ moodLog }, userId || 'anon');
    return moodEntry;
  }

  const payload = {
    user_id:   userId,
    mood:      moodEntry.mood,
    note:      moodEntry.note || '',
    logged_at: moodEntry.logged_at || new Date().toISOString(),
  };

  const { error } = await supabase.from('mood_log').insert(payload);
  if (error) throw error;
  return moodEntry;
}

export async function deleteTodo(userId, todoId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const todos = readLocal('todos', userId || 'anon', []).filter(todo => todo.id !== todoId);
    persistFallbackState({ todos }, userId || 'anon');
    return todos;
  }

  const { error } = await supabase.from('todos').delete().eq('id', todoId).eq('user_id', userId);
  if (error) throw error;
}

export async function upsertTodo(userId, todo) {
  const todos = state.get('user.todos') || [];
  const next = todo.id
    ? todos.map(item => item.id === todo.id ? { ...item, ...todo } : item)
    : [{ ...todo }, ...todos];

  await saveTodos(userId, next);
  return next;
}

export function getDefaultProfile() {
  return withDerivedProfileStats(
    { ...DEFAULT_PROFILE },
    {
      todos:          [],
      projects:       getDefaultProjects(),
      widgetPrefs:    buildDefaultWidgetPrefs('anon'),
      visibleWidgets: [],
    }
  );
}

export function getDefaultLinks()    { return DEFAULT_LINKS.map(item => ({ ...item })); }
export function getDefaultProjects() { return DEFAULT_PROJECTS.map(item => ({ ...item })); }

export function getDefaultWidgetPrefs(userId = 'anon') {
  return buildDefaultWidgetPrefs(userId);
}
