export { applyTheme, readStoredTheme } from './applyTheme.js';

/**
 * Token name constants for JS-driven styling (charts, canvas, inline styles).
 * Values always come from CSS variables at runtime.
 */
export const CSS_VARS = {
  surfaceDim: '--cd-surface-dim',
  surface: '--cd-surface',
  surfaceBright: '--cd-surface-bright',
  surfaceContainerLow: '--cd-surface-container-low',
  surfaceContainerHigh: '--cd-surface-container-high',
  text: '--cd-text',
  muted: '--cd-muted',
  border: '--cd-border',
  primary: '--cd-primary',
  primaryHover: '--cd-primary-hover',
  primaryActive: '--cd-primary-active',
  accentSoft: '--cd-accent-soft',
  accentEmphasis: '--cd-accent-emphasis',
  onPrimary: '--cd-on-primary',
  primaryContainer: '--cd-primary-container',
  onPrimaryContainer: '--cd-on-primary-container',
  brand: '--cd-brand',
  blue: '--cd-blue',
  green: '--cd-green',
  red: '--cd-red',
};

/**
 * Read a resolved token value from :root (respects .dark).
 */
export function getCssVar(name, fallback = '') {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
