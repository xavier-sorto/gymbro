/** Inline SVG icons (no external assets, so they work offline and cost nothing). */
const ICON_PATHS = {
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  history: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  library: 'M4 5h4v14H4zM10 5h4v14h-4zM16.5 6.2l3.4-.9 3 12.6-3.4.9z',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  star: 'M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z',
  close: 'M6 6l12 12M18 6L6 18',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  table: 'M4 4h16v16H4zM4 10h16M10 4v16',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg
      class="icon"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
