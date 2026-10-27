// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { openStore } from '../../src/store';
import { fireEvent, renderApp, screen } from './helpers';

describe('plate calculator screen', () => {
  async function openPlates() {
    await openStore();
    window.location.hash = '#/plates';
    renderApp();
    await screen.findByText('Plate calculator');
  }

  it('starts at 135 on a 45 lb bar and updates as the target changes', async () => {
    await openPlates();
    expect(screen.getByText('Each side: 45')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Target weight (lb)'), { target: { value: '185' } });
    expect(screen.getByText('Each side: 45 + 25')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Target weight (lb) plus'));
    expect(screen.getByText('Each side: 45 + 25 + 2.5')).toBeTruthy();
  });

  it('says so when the target is lighter than the bar or cannot be loaded exactly', async () => {
    await openPlates();
    fireEvent.input(screen.getByLabelText('Target weight (lb)'), { target: { value: '30' } });
    expect(screen.getByText('That is lighter than the bar.')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Target weight (lb)'), { target: { value: '137' } });
    expect(screen.getByText('The closest you can load is 135 lb.')).toBeTruthy();
  });
});
