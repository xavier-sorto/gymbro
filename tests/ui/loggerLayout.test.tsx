// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { useCssHeight } from '../../src/ui/useCssHeight';
import { fireEvent, renderInActivePush, screen, SEED_BENCH } from './helpers';

const css = (file: string) => readFileSync(`src/ui/styles/${file}`, 'utf8');
const root = () => document.documentElement.style;

function Bar({ variable }: { variable: string | null }) {
  const ref = useCssHeight(variable);
  return <div ref={ref} data-testid="bar" />;
}

afterEach(() => {
  vi.unstubAllGlobals();
  root().removeProperty('--bar-height');
});

describe('useCssHeight', () => {
  it('sets the variable to the element height, follows it as it changes, and removes it afterwards', () => {
    let height = 50;
    let notify: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
    const { unmount } = render(<Bar variable="--bar-height" />);
    expect(root().getPropertyValue('--bar-height')).toBe('50px');
    height = 84.5;
    notify();
    expect(root().getPropertyValue('--bar-height')).toBe('84.5px');
    unmount();
    expect(root().getPropertyValue('--bar-height')).toBe('');
    expect(disconnect).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still sets it once where ResizeObserver does not exist, and does nothing without a variable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height: 20 }) as DOMRect);
    const first = render(<Bar variable="--bar-height" />);
    expect(root().getPropertyValue('--bar-height')).toBe('20px');
    first.unmount();
    render(<Bar variable={null} />);
    expect(root().getPropertyValue('--bar-height')).toBe('');
    spy.mockRestore();
  });
});

describe("today's target in the logger", () => {
  async function openBench() {
    await renderInActivePush();
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    await screen.findByLabelText('Weight');
  }

  it('shows nothing the first time a lift is done', async () => {
    await openStore();
    await openBench();
    expect(document.querySelector('.next-set-today')).toBeNull();
  });

  it('shows the target above the steppers once there is history', async () => {
    await openStore();
    const finished = await startWorkout(null);
    const entry = await addWorkoutExercise(finished.id, SEED_BENCH);
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    await finishWorkout(finished.id);
    await openBench();
    expect(document.querySelector('.next-set')?.firstElementChild?.textContent).toMatch(/^Today 105 × 6/);
  });
});

describe('fixed bars stack on measured heights', () => {
  const exercise = css('exercise.css');
  const rule = (selector: string) => exercise.slice(exercise.indexOf(`${selector} {`), exercise.indexOf('}', exercise.indexOf(`${selector} {`)));

  it('keeps the undo bar fixed so it never moves the page, above the logger and above the rest bar when resting', () => {
    expect(rule('.undo-toast')).toContain('position: fixed');
    expect(rule('.undo-toast')).toContain('var(--logger-height)');
    expect(rule('body:has(.rest-bar) .undo-toast')).toContain('var(--rest-height)');
  });

  it('lets the rest bar take its natural height instead of a guessed minimum', () => {
    expect(rule('.rest-bar')).not.toContain('min-height');
  });

  it('pads the page by the measured bars, with no leftover fixed guess', () => {
    expect(exercise).toContain('var(--logger-height) + 24px');
    expect(exercise).not.toMatch(/\+ 360px|\+ 340px/);
  });
});
