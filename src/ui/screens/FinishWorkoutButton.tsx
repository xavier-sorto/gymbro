import { useState } from 'preact/hooks';
import { FinishSheet } from './FinishSheet';

/** `ready` false (nothing logged yet) keeps the big button quiet; it turns lime once a working set exists. */
export function FinishWorkoutButton({ variant, ready = true }: { variant: 'small' | 'big'; ready?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={variant === 'small' ? 'link-button' : ready ? 'primary-button' : 'big-button secondary'} onClick={() => setOpen(true)}>
        {variant === 'big' ? 'Finish workout' : 'Finish it'}
      </button>
      {open && <FinishSheet onClose={() => setOpen(false)} />}
    </>
  );
}
