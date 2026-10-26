import { navigate } from '../router';
import { Icon } from './Icon';

/** The top-left "‹ Place" button that goes back to a parent screen. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <button type="button" class="back" onClick={() => navigate(to)}>
      <Icon name="chevronLeft" />
      {label}
    </button>
  );
}
