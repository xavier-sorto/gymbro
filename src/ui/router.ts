import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'home' }
  | { name: 'workout' }
  | { name: 'exercise'; workoutExerciseId: string }
  | { name: 'add' }
  | { name: 'days' }
  | { name: 'day'; dayTypeId: string }
  | { name: 'history' }
  | { name: 'historyDetail'; workoutId: string }
  | { name: 'library' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second, third] = parts;
  if (first === 'workout') {
    if (second === 'ex' && third) return { name: 'exercise', workoutExerciseId: decodeURIComponent(third) };
    if (second === 'add') return { name: 'add' };
    return { name: 'workout' };
  }
  if (first === 'days') return second ? { name: 'day', dayTypeId: decodeURIComponent(second) } : { name: 'days' };
  if (first === 'history') return second ? { name: 'historyDetail', workoutId: decodeURIComponent(second) } : { name: 'history' };
  if (first === 'library') return { name: 'library' };
  return { name: 'home' };
}

export const dayHash = (dayTypeId: string) => `#/days/${encodeURIComponent(dayTypeId)}`;

export const historyHash = (workoutId: string) => `#/history/${encodeURIComponent(workoutId)}`;

export const exerciseHash = (workoutExerciseId: string) => `#/workout/ex/${encodeURIComponent(workoutExerciseId)}`;

export function navigate(hash: string): void {
  window.location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

export const needsActiveWorkout = (route: Route) =>
  route.name === 'workout' || route.name === 'exercise' || route.name === 'add';
