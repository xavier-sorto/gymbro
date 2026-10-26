import { render } from 'preact';
import { App } from './App';
import './styles.css';

export function mountApp(container: HTMLElement): void {
  render(<App />, container);
}
