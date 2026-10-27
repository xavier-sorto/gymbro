import { render } from 'preact';
import { App } from './App';
import { UpdateBanner } from './components/UpdateBanner';
import './styles.css';

export function mountApp(container: HTMLElement): void {
  render(
    <>
      <App />
      <UpdateBanner />
    </>,
    container,
  );
}
