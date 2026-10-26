import type { Route } from '../router';
import { Icon, type IconName } from './Icon';

const TABS: { label: string; hash: string; icon: IconName; routes: string[] }[] = [
  { label: 'Workout', hash: '#/', icon: 'dumbbell', routes: ['home', 'workout', 'exercise', 'add', 'days', 'day'] },
  { label: 'History', hash: '#/history', icon: 'history', routes: ['history'] },
  { label: 'Library', hash: '#/library', icon: 'library', routes: ['library', 'libraryExercise'] },
];

export function BottomBar({ route }: { route: Route }) {
  return (
    <nav class="bottom-bar">
      {TABS.map((tab) => (
        <a key={tab.label} href={tab.hash} class={tab.routes.includes(route.name) ? 'tab-current' : ''}>
          <Icon name={tab.icon} />
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
