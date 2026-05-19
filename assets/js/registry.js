/* ═══════════════════════════════════════════════════════════
   DUSK — registry.js
   Registre central des widgets.
   Chaque widget exporte : { id, label, size, render, renderDetail? }
═══════════════════════════════════════════════════════════ */

import { clockWidget }      from './widgets/clock.js';
import { worldClockWidget } from './widgets/world-clock.js';
import { calendarWidget }   from './widgets/calendar.js';
import { weatherWidget }    from './widgets/weather.js';
import { moonWidget }       from './widgets/moon.js';
import { sunriseWidget }    from './widgets/sunrise.js';
import { quoteWidget }      from './widgets/quote.js';
import { complimentWidget } from './widgets/compliment.js';
import { wordWidget }       from './widgets/word.js';
import { quizWidget }       from './widgets/quiz.js';
import { memoryWidget }     from './widgets/memory.js';
import { snakeWidget }      from './widgets/snake.js';
import { tictactoeWidget }  from './widgets/tictactoe.js';
import { game2048Widget }   from './widgets/game2048.js';
import { reflexWidget }     from './widgets/reflex.js';
import { todoWidget }       from './widgets/todo.js';
import { timerWidget }      from './widgets/timer.js';
import { moodWidget }       from './widgets/mood.js';
import { profileWidget }    from './widgets/profile.js';
import { projectsWidget }   from './widgets/projects.js';
import { linksWidget }      from './widgets/links.js';
import { statsWidget }      from './widgets/stats.js';
import { secretWidget }     from './widgets/secret.js';
import { mysteryWidget }    from './widgets/mystery.js';
import { radioWidget }      from './widgets/radio.js';
import { adminWidget }      from './widgets/admin.js';
import { state }            from './state.js';

const BASE_REGISTRY = [
  clockWidget,
  weatherWidget,
  quoteWidget,
  todoWidget,
  moonWidget,
  wordWidget,
  snakeWidget,
  complimentWidget,
  timerWidget,
  memoryWidget,
  profileWidget,
  sunriseWidget,
  calendarWidget,
  quizWidget,
  tictactoeWidget,
  game2048Widget,
  reflexWidget,
  worldClockWidget,
  linksWidget,
  statsWidget,
  projectsWidget,
  moodWidget,
  radioWidget,
  secretWidget,
  mysteryWidget,
];

export function getWidgetRegistry() {
  const role = state.get('user.profile')?.role;
  if (role === 'admin') return [...BASE_REGISTRY, adminWidget];
  return BASE_REGISTRY;
}

// Registre complet (admin inclus) — utilisé pour les lookups par id
export const WIDGET_REGISTRY_ALL = [...BASE_REGISTRY, adminWidget];

// Alias statique utilisé par grid.js via getWidgetRegistry()
export const WIDGET_REGISTRY = BASE_REGISTRY;
