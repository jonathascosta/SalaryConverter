type Theme = 'light' | 'dark';

/** The light/dark switch, shared with jonathas.net: follows the OS until the player picks a theme. */
export function initThemeToggle(): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ?? (prefersDark.matches ? 'dark' : 'light')) === 'dark';

  function sync() {
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.setAttribute('aria-pressed', String(isDark()));
    }
  }

  function apply(theme: Theme) {
    root.dataset.theme = theme;
    // Keep the browser UI (and the installed app's title bar) in step with the chosen theme.
    const background = getComputedStyle(document.body).backgroundColor;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', background);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this page only.
    }
    sync();
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
    const next: Theme = isDark() ? 'light' : 'dark';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(() => apply(next));
    else apply(next);
  });

  prefersDark.addEventListener('change', sync);
  sync();
}
