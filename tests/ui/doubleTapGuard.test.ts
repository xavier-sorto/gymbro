// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOUBLE_TAP_MS, installDoubleTapGuard } from '../../src/ui/doubleTapGuard';

let clock = 0;
let button: HTMLButtonElement;
let icon: SVGSVGElement;
let input: HTMLInputElement;
let clicks: number;
let removeGuard: () => void;

const tap = (target: Element) => {
  const event = new Event('touchend', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  clock = 1000;
  clicks = 0;
  document.body.innerHTML = '';
  button = document.createElement('button');
  button.addEventListener('click', () => (clicks += 1));
  icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  button.append(icon);
  input = document.createElement('input');
  document.body.append(button, input);
  removeGuard = installDoubleTapGuard(document, () => clock);
});

afterEach(() => {
  removeGuard();
  vi.restoreAllMocks();
});

describe('double-tap zoom guard', () => {
  it('leaves a single tap alone', () => {
    expect(tap(button).defaultPrevented).toBe(false);
    expect(clicks).toBe(0);
  });

  it('cancels the zoom on a quick second tap and clicks the button itself', () => {
    tap(button);
    clock += DOUBLE_TAP_MS - 1;
    expect(tap(button).defaultPrevented).toBe(true);
    expect(clicks).toBe(1);
  });

  it('treats a tap on the icon inside a button as a tap on the button', () => {
    tap(icon);
    clock += 100;
    expect(tap(icon).defaultPrevented).toBe(true);
    expect(clicks).toBe(1);
  });

  it('keeps guarding a third quick tap', () => {
    tap(button);
    clock += 100;
    tap(button);
    clock += 100;
    expect(tap(button).defaultPrevented).toBe(true);
    expect(clicks).toBe(2);
  });

  it('ignores a second tap that comes after the window', () => {
    tap(button);
    clock += DOUBLE_TAP_MS + 1;
    expect(tap(button).defaultPrevented).toBe(false);
    expect(clicks).toBe(0);
  });

  it('does not interfere with double-tapping into a text field', () => {
    tap(input);
    clock += 100;
    expect(tap(input).defaultPrevented).toBe(false);
  });
});
