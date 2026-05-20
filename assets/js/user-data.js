/* ── Données utilisateur & persistance ─────────────────────── */
import { isSupabaseConfigured, supabase } from './supabase.js';

/* ------------------------------------------------------------ */
/* Utils                                                        */
/* ------------------------------------------------------------ */

function storageKey(key, userId = 'anon') {
  return `dusk:${userId}:${key}`;
}

function readLocal(key, userId = 'anon', fallback = null) {
  try {
    const raw = localStorage.getItem(storageKey(key, userId));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value, userId = 'anon') {
  localStorage.setItem(storageKey(key, userId), JSON.stringify(value));
}

function persistFallbackState(data, userId = 'anon') {
  Object.entries(data).forEach(([key, value]) => {
    writeLocal(key, value, userId);
  });
}

/* ------------------------------------------------------------ */
/* Defaults                                                     */
/* ------------------------------------------------------------ */

export const DEFAULT_PROFILE = {
  username: 'Guest',
  role: 'Dreamer',
  bio: 'Bienvenue sur Dusk.',
  avatar: '',
  stats: [
    { label: 'Todos', value: '0' },
    { label: 'Projects', value: '0' },
    { label: 'Widgets', value: '0' }
  ]
};

export function getDefaultTodos() {
  return [
    {
      id: crypto.randomUUID(),
      text: 'Bienvenue sur Dusk',
      completed: false,
      createdAt: Date.now()
    }
  ];
}

export function getDefaultProjects() {
  return [
    {
      id: crypto.randomUUID(),
      title: 'Premier projet',
      description: 'Créer quelque chose de génial.',
      status: 'active',
      createdAt: Date.now()
    }
  ];
}

/* ------------------------------------------------------------ */
/* Profile                                                      */
/* ------------------------------------------------------------ */

export async function loadProfile(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return (
      readLocal('profile', userId || 'anon', DEFAULT_PROFILE) ||
      DEFAULT_PROFILE
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    ...DEFAULT_PROFILE,
    ...(data || {})
  };
}

export async function saveProfile(userId, profile) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ profile }, userId || 'anon');
    return profile;
  }

  const payload = {
    id: userId,
    username: profile.username,
    bio: profile.bio,
    avatar: profile.avatar,
    role: profile.role
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload);

  if (error) throw error;

  return profile;
}

/* ------------------------------------------------------------ */
/* Todos                                                        */
/* ------------------------------------------------------------ */

export async function loadTodos(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return (
      readLocal('todos', userId || 'anon', getDefaultTodos()) ||
      getDefaultTodos()
    );
  }

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(todo => ({
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.created_at
  }));
}

export async function saveTodos(userId, todos) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ todos }, userId || 'anon');
    return todos;
  }

  const payload = todos.map(todo => ({
    id: todo.id,
    user_id: userId,
    text: todo.text,
    completed: todo.completed,
    created_at: todo.createdAt
  }));

  const { error } = await supabase
    .from('todos')
    .upsert(payload);

  if (error) throw error;

  return todos;
}

export async function deleteTodo(userId, todoId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const todos = readLocal('todos', userId || 'anon', [])
      .filter(todo => todo.id !== todoId);

    persistFallbackState({ todos }, userId || 'anon');

    return todos;
  }

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId);

  if (error) throw error;
}

/* ------------------------------------------------------------ */
/* Projects                                                     */
/* ------------------------------------------------------------ */

export async function loadProjects(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return (
      readLocal('projects', userId || 'anon', getDefaultProjects()) ||
      getDefaultProjects()
    );
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(project => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    createdAt: project.created_at
  }));
}

export async function saveProjects(userId, projects) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ projects }, userId || 'anon');
    return projects;
  }

  const payload = projects.map(project => ({
    id: project.id,
    user_id: userId,
    title: project.title,
    description: project.description,
    status: project.status,
    created_at: project.createdAt
  }));

  const { error } = await supabase
    .from('projects')
    .upsert(payload);

  if (error) throw error;

  return projects;
}

export async function deleteProject(userId, projectId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    const projects = readLocal('projects', userId || 'anon', [])
      .filter(project => project.id !== projectId);

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

/* ------------------------------------------------------------ */
/* Widget preferences                                           */
/* ------------------------------------------------------------ */

export async function loadWidgetPrefs(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return readLocal('widgetPrefs', userId || 'anon', {});
  }

  const { data, error } = await supabase
    .from('widget_prefs')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const prefs = {};

  (data || []).forEach(item => {
    prefs[item.widget_id] = item.enabled;
  });

  return prefs;
}

export async function saveWidgetPrefs(userId, prefs) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ widgetPrefs: prefs }, userId || 'anon');
    return prefs;
  }

  const payload = Object.entries(prefs).map(([widget_id, enabled]) => ({
    user_id: userId,
    widget_id,
    enabled
  }));

  const { error } = await supabase
    .from('widget_prefs')
    .upsert(payload);

  if (error) throw error;

  return prefs;
}

/* ------------------------------------------------------------ */
/* Mood                                                         */
/* ------------------------------------------------------------ */

export async function saveMood(userId, mood) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    persistFallbackState({ mood }, userId || 'anon');
    return mood;
  }

  const { error } = await supabase
    .from('moods')
    .upsert({
      user_id: userId,
      mood,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  return mood;
}
