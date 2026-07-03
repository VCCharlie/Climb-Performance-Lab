/**
 * Applies light/dark theme to the document root.
 * Toggles the Tailwind `dark` class and updates browser chrome hints.
 */

const THEME_COLOR = {
  light: '#e8eaed',
  dark: '#0f1218',
};

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isDark ? THEME_COLOR.dark : THEME_COLOR.light);
  }
}

export function readStoredTheme() {
  if (typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  return stored === 'dark' ? 'dark' : 'light';
}
