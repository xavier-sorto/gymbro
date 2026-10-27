import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = (file: string) => readFileSync(`src/ui/styles/${file}`, 'utf8');

/** The declaration block of the first rule whose selector starts with `selector`. */
function rule(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No rule for ${selector}`);
  return source.slice(start, source.indexOf('}', start));
}

describe('iPhone touch handling', () => {
  it('turns off double-tap zoom on the page and its controls', () => {
    const base = css('base.css');
    expect(base).toMatch(/html, body, a, button, input, select, textarea, label \{[^}]*touch-action: manipulation/);
  });
});

describe('fixed bars stay put on iOS', () => {
  const fixedBars: [string, string][] = [
    ['nav.css', '.bottom-bar'],
    ['exercise.css', '.rest-bar'],
    ['exercise.css', '.screen > .next-set'],
  ];

  it.each(fixedBars)('%s %s is centred without a transform', (file, selector) => {
    const declarations = rule(css(file), selector);
    expect(declarations).toContain('position: fixed');
    expect(declarations).not.toContain('transform');
    expect(declarations).toMatch(/left: 0; right: 0; margin: 0 auto/);
  });

  it('keeps the tab bar free of backdrop blur, which iOS composites separately', () => {
    expect(rule(css('nav.css'), '.bottom-bar')).not.toContain('backdrop-filter');
  });
});
