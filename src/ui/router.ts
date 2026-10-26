import { useEffect, useState } from 'preact/hooks';

export type Route =
  | { name: 'home' }
  | { name: 'workout' }
  | { name: 'exercise'; workoutExerciseId: string }
  | { name: 'add' }
  | { name: 'days' }
  | { name: 'day'; dayTypeId: string }
  | { name: 'history' }
  | { name: 'library' }
  | { name: 'data' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second, third] = parts;
  if (first === 'workout') {
    if (second === 'ex' && third) return { name: 'exercise', workoutExerciseId: decodeURIComponent(third) };
    if (second === 'add') return { name: 'add' };
    return { name: 'workout' };
  }
  if (first === 'days') return second ? { name: 'day', dayTypeId: decodeURIComponent(second) } : { name: 'days' };
  if (first === 'history') return { name: 'history' };
  if (first === 'library') return second === 'data' ? { name: 'data' } : { name: 'library' };
  return { name: 'home' };
}

export const dayHash = (dayTypeId: string) => `#/days/${encodeURIComponent(dayTypeId)}`;

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
