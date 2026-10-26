import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmSheetProps) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p>{message}</p>
      <button type="button" class="primary-button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </Sheet>
  );
}
