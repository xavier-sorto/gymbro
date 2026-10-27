import { useEffect, useRef } from 'preact/hooks';

/** How long the Undo stays on offer. */
export const UNDO_MS = 6000;

interface UndoToastProps {
  /** A new id restarts the countdown; the same id keeps it running across re-renders. */
  id: number;
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}

/** A short-lived "Set saved · Undo" bar that sticks to the top of the screen. */
export function UndoToast({ id, message, onUndo, onExpire }: UndoToastProps) {
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    const timer = setTimeout(() => expire.current(), UNDO_MS);
    return () => clearTimeout(timer);
  }, [id]);
  return (
    <div class="undo-toast" role="status">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
