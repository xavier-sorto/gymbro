import type { Route } from '../router';

const TABS = [
  { label: 'Workout', hash: '#/', routes: ['home', 'workout', 'exercise', 'add', 'days', 'day'] },
  { label: 'History', hash: '#/history', routes: ['history'] },
  { label: 'Library', hash: '#/library', routes: ['library'] },
];

export function BottomBar({ route }: { route: Route }) {
  return (
    <nav class="bottom-bar">
      {TABS.map((tab) => (
        <a key={tab.label} href={tab.hash} class={tab.routes.includes(route.name) ? 'tab-current' : ''}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
