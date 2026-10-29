import { useCallback, useRef } from 'preact/hooks';

/**
 * A ref for a fixed bar that keeps a CSS variable on the page equal to the bar's real height, so the
 * bars stacked around it (rest bar, logger, undo bar, page padding) never rely on a guessed size.
 * The variable is removed when the bar goes away, which brings back the estimate set in tokens.css.
 */
export function useCssHeight(variable: string | null) {
  const observer = useRef<ResizeObserver | null>(null);
  return useCallback(
    (element: HTMLElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (!variable) return;
      const root = document.documentElement;
      if (!element) {
        root.style.removeProperty(variable);
        return;
      }
      const apply = () => root.style.setProperty(variable, `${element.getBoundingClientRect().height}px`);
      apply();
      if (typeof ResizeObserver === 'undefined') return;
      observer.current = new ResizeObserver(apply);
      observer.current.observe(element);
    },
    [variable],
  );
}
