import { useState } from 'preact/hooks';
import { FinishSheet } from './FinishSheet';

export function FinishWorkoutButton({ variant }: { variant: 'small' | 'big' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={variant === 'big' ? 'primary-button' : 'link-button'} onClick={() => setOpen(true)}>
        {variant === 'big' ? 'Finish workout' : 'Finish it'}
      </button>
      {open && <FinishSheet onClose={() => setOpen(false)} />}
    </>
  );
}
