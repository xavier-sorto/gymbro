import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync('src/ui/styles/tokens.css', 'utf8');

/** The declarations of the first rule that starts with `selector`, as name to value. */
function block(selector: string): Record<string, string> {
  const start = tokens.indexOf(`${selector} {`);
  const body = tokens.slice(start, tokens.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((match) => [match[1]!, match[2]!]));
}

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('text colours on the surfaces they sit on', () => {
  const themes = { dark: { ...block(':root') }, light: { ...block(':root'), ...block(":root[data-theme='light']") } };

  for (const [name, theme] of Object.entries(themes)) {
    for (const surface of ['--bg', '--surface', '--surface-2', '--bar-bg']) {
      for (const text of ['--faint', '--muted', '--text']) {
        it(`${name}: ${text} on ${surface} is at least 4.5:1`, () => {
          expect(contrast(theme[text]!, theme[surface]!)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  for (const [name, theme] of Object.entries(themes)) {
    for (const surface of ['--bg', '--surface']) {
      for (const text of ['--warm', '--mid', '--accent', '--danger']) {
        it(`${name}: status colour ${text} on ${surface} is at least 4.5:1`, () => {
          expect(contrast(theme[text]!, theme[surface]!)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  it('keeps the faint text visibly quieter than the muted text', () => {
    for (const theme of Object.values(themes)) {
      expect(theme['--faint']).not.toBe(theme['--muted']);
    }
  });
});
