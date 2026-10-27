import { useState } from 'preact/hooks';
import { platesFor } from '../../engine';
import { BackLink } from '../components/BackLink';
import { StepperField } from '../components/StepperField';
import { getSettings } from '../settings/settings';

const DEFAULT_TARGET = '135';

/** Which plates go on each side of the bar for a target weight. */
export function PlatesScreen() {
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [bar, setBar] = useState(() => String(getSettings().barLb));
  const targetLb = Number(target) || 0;
  const barLb = Number(bar) || 0;
  const load = platesFor(targetLb, barLb);

  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      <h1 class="h1 library-title">Plate calculator</h1>
      <StepperField label="Target weight (lb)" value={target} step={5} decimal onChange={setTarget} />
      <StepperField label="Bar weight (lb)" value={bar} step={5} decimal onChange={setBar} />
      {targetLb < barLb ? (
        <p class="hint">That is lighter than the bar.</p>
      ) : (
        <>
          <div class="plate-row" aria-label="Plates for each side">
            <div class="plate-bar" />
            {load.perSide.map((plate, index) => (
              <div key={index} class="plate" style={{ height: `${28 + plate}px` }}>
                {plate}
              </div>
            ))}
          </div>
          <p class="plate-summary">
            {load.perSide.length ? `Each side: ${load.perSide.join(' + ')}` : 'Just the bar'}
          </p>
          {load.totalLb !== targetLb && <p class="hint">The closest you can load is {load.totalLb} lb.</p>}
        </>
      )}
    </main>
  );
}
