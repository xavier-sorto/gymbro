import type { ComponentChildren } from 'preact';

interface SheetProps {
  title: string;
  children: ComponentChildren;
  onClose: () => void;
}

/** A bottom sheet over the screen; the bottom half is where thumbs are. */
export function Sheet({ title, children, onClose }: SheetProps) {
  return (
    <div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-label={title}>
        <div class="sheet-header">
          <h2>{title}</h2>
          <button type="button" class="link-button" onClick={onClose}>
            Cancel
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
