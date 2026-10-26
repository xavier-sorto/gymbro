import { describe, expect, it } from 'vitest';
import { formatWeekdayDate } from '../../src/ui/format';

describe('formatWeekdayDate', () => {
  it('shows weekday, month and day', () => {
    expect(formatWeekdayDate(new Date(2026, 9, 26, 12).getTime())).toBe('Mon, Oct 26');
  });
});
