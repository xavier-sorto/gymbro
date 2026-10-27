import { MUSCLE_LABELS } from '../../engine';
import type { Suggestion } from './suggestion';

const sets = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStart: (dayTypeId: string) => void;
}

/** On Home: which day type would do the most for this week's weekly volume, and who is furthest behind. */
export function SuggestionCard({ suggestion, onStart }: SuggestionCardProps) {
  const { behind, totalMissing, fit } = suggestion;
  if (behind.length === 0) {
    return (
      <section class="suggestion">
        <p class="eyebrow">This week</p>
        <p class="suggestion-title">On track</p>
        <p class="suggestion-sub">Every muscle has reached the low end of its weekly range.</p>
        <a class="suggestion-behind" href="#/volume">
          See weekly volume
        </a>
      </section>
    );
  }
  return (
    <section class="suggestion">
      <p class="eyebrow">Suggested today</p>
      {fit ? (
        <>
          <p class="suggestion-title">{fit.dayType.name}</p>
          <p class="suggestion-sub">
            Fills about {Math.round(fit.covers)} of the {Math.round(totalMissing)} sets you still need this week, mostly{' '}
            {fit.muscles.map((muscle) => MUSCLE_LABELS[muscle].toLowerCase()).join(', ')}.
          </p>
          <button type="button" class="primary-button" onClick={() => onStart(fit.dayType.id)}>
            Start {fit.dayType.name}
          </button>
        </>
      ) : (
        <p class="suggestion-sub">None of your day types train what is missing this week. Add exercises for those muscles, or pick any workout.</p>
      )}
      <a class="suggestion-behind" href="#/volume">
        Furthest behind: {behind.map((gap) => `${MUSCLE_LABELS[gap.muscle]} ${sets(gap.sets)} of ${gap.goal}`).join(' · ')}
      </a>
    </section>
  );
}
