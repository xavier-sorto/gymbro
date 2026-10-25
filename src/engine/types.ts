export type PlannedRole = 'warmup' | 'climb' | 'top' | 'working';

export interface PlannedSet {
  weightLb: number | null;
  reps: number | null;
  seconds: number | null;
  isWarmup: boolean;
  role: PlannedRole;
}

export interface SessionSummary {
  startedAt: number;
  workingSets: PlannedSet[];
}

export interface Best {
  weightLb?: number;
  reps?: number;
  seconds?: number;
  startedAt: number;
}

export interface Target {
  sets: PlannedSet[];
  note: string;
}

export interface Guide {
  firstTime: boolean;
  last: SessionSummary | null;
  best: Best | null;
  target: Target | null;
  /** Stub until the warm-ups milestone: always empty. */
  warmups: PlannedSet[];
  /** Stub until the stall-detection milestone: always null. */
  stall: { stuckSessions: number; reset: PlannedSet } | null;
}
