import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ title, message, confirmLabel, destructive = false, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p>{message}</p>
      <button type="button" class={destructive ? 'danger-button' : 'primary-button'} onClick={onConfirm}>
        {confirmLabel}
      </button>
    </Sheet>
  );
}
