export interface StatWorkout {
  startedAt: number;
  volumeLb: number;
}

export interface HistoryStats {
  weekWorkouts: number;
  weekVolumeLb: number;
  /** Consecutive calendar weeks (Monday to Sunday) with a workout, ending this week or last week. */
  streakWeeks: number;
}

/** Midnight of the Monday that starts the week containing `time`, in local time. */
export function weekStart(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day.getTime();
}

const previousWeek = (start: number) => weekStart(start - 1);

export function summarize(workouts: readonly StatWorkout[], now: number): HistoryStats {
  const thisWeek = weekStart(now);
  const inThisWeek = workouts.filter((workout) => weekStart(workout.startedAt) === thisWeek);
  const weeks = new Set(workouts.map((workout) => weekStart(workout.startedAt)));
  // A week with no workout yet should not break a streak that was alive last week.
  let cursor = weeks.has(thisWeek) ? thisWeek : previousWeek(thisWeek);
  let streakWeeks = 0;
  while (weeks.has(cursor)) {
    streakWeeks += 1;
    cursor = previousWeek(cursor);
  }
  return {
    weekWorkouts: inThisWeek.length,
    weekVolumeLb: inThisWeek.reduce((total, workout) => total + workout.volumeLb, 0),
    streakWeeks,
  };
}
