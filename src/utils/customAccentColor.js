/**
 * User-defined accent colors (Settings → Custom palette).
 * Logo yellow (--cd-brand) is never modified here.
 */

export const CUSTOM_ACCENT_COLORS_STORAGE_KEY = 'customAccentColors';

/** CSS variables we may set inline when palette is "custom". */
export const CUSTOM_ACCENT_CSS_VARS = [
  '--cd-accent-soft',
  '--cd-primary',
  '--cd-primary-rgb',
  '--cd-primary-hover',
  '--cd-primary-active',
  '--cd-accent-emphasis',
  '--cd-accent-emphasis-rgb',
  '--cd-primary-container',
  '--cd-on-primary-container',
  '--cd-focus-ring',
];

const DEFAULT_CUSTOM = {
  emphasis: '#ea580c',
  fill: '#fb923c',
};

/**
 * @param {string} hex
 * @returns {string | null} #rrggbb lowercase
 */
export function normalizeHexColor(hex) {
  if (typeof hex !== 'string') return null;
  let s = hex.trim();
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    s = `#${r}${r}${g}${g}${b}${b}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
  return s.toLowerCase();
}

/**
 * @param {string} hex
 * @returns {[number, number, number] | null}
 */
export function hexToRgbTuple(hex) {
  const n = normalizeHexColor(hex);
  if (!n) return null;
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

/**
 * @param {[number, number, number]} rgb
 */
export function rgbTupleToCss(rgb) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

/**
 * @param {string} hex
 * @param {number} amount 0–1 toward black
 */
export function darkenHex(hex, amount = 0.12) {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return hex;
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const out = [f(rgb[0]), f(rgb[1]), f(rgb[2])];
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * @param {string} hex
 * @param {number} whiteRatio 0 = original, 1 = white
 */
export function mixHexWithWhite(hex, whiteRatio = 0.88) {
  const rgb = hexToRgbTuple(hex);
  if (!rgb) return hex;
  const mix = (c) => Math.round(c * (1 - whiteRatio) + 255 * whiteRatio);
  const out = [mix(rgb[0]), mix(rgb[1]), mix(rgb[2])];
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * @returns {{ emphasis: string, fill: string }}
 */
export function getDefaultCustomAccentColors() {
  return { ...DEFAULT_CUSTOM };
}

/**
 * Preview swatches for the Custom palette card (emphasis, fill, auto container tint).
 * @param {{ emphasis: string, fill: string }} colors
 * @returns {[string, string, string]}
 */
export function getCustomPreviewSwatches(colors) {
  const emphasis = normalizeHexColor(colors.emphasis) || DEFAULT_CUSTOM.emphasis;
  const fill = normalizeHexColor(colors.fill) || DEFAULT_CUSTOM.fill;
  return [emphasis, fill, mixHexWithWhite(fill, 0.82)];
}

/**
 * @param {unknown} raw
 * @returns {{ emphasis: string, fill: string } | null}
 */
export function normalizeCustomAccentColors(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const emphasis = normalizeHexColor(raw.emphasis);
  const fill = normalizeHexColor(raw.fill);
  if (!emphasis || !fill) return null;
  return { emphasis, fill };
}

export function readStoredCustomAccentColors() {
  if (typeof localStorage === 'undefined') return getDefaultCustomAccentColors();
  try {
    const stored = localStorage.getItem(CUSTOM_ACCENT_COLORS_STORAGE_KEY);
    if (!stored) return getDefaultCustomAccentColors();
    const parsed = JSON.parse(stored);
    return normalizeCustomAccentColors(parsed) || getDefaultCustomAccentColors();
  } catch {
    return getDefaultCustomAccentColors();
  }
}

/**
 * @param {{ emphasis: string, fill: string }} colors
 */
export function buildCustomAccentCssVariables(colors) {
  const emphasis = normalizeHexColor(colors.emphasis) || DEFAULT_CUSTOM.emphasis;
  const fill = normalizeHexColor(colors.fill) || DEFAULT_CUSTOM.fill;
  const emphasisRgb = hexToRgbTuple(emphasis);
  const fillRgb = hexToRgbTuple(fill);
  if (!emphasisRgb || !fillRgb) return {};

  return {
    '--cd-accent-emphasis': emphasis,
    '--cd-accent-emphasis-rgb': rgbTupleToCss(emphasisRgb),
    '--cd-primary': fill,
    '--cd-primary-rgb': rgbTupleToCss(fillRgb),
    '--cd-primary-hover': darkenHex(emphasis, 0.08),
    '--cd-primary-active': darkenHex(emphasis, 0.16),
    '--cd-primary-container': mixHexWithWhite(fill, 0.82),
    '--cd-on-primary-container': darkenHex(emphasis, 0.22),
    '--cd-accent-soft': mixHexWithWhite(fill, 0.92),
    '--cd-focus-ring': `rgb(${rgbTupleToCss(emphasisRgb)} / 0.38)`,
  };
}

/**
 * @param {HTMLElement} root
 */
export function clearCustomAccentOverrides(root) {
  for (const name of CUSTOM_ACCENT_CSS_VARS) {
    root.style.removeProperty(name);
  }
}

/**
 * @param {HTMLElement} root
 * @param {{ emphasis: string, fill: string }} colors
 */
export function applyCustomAccentOverrides(root, colors) {
  const vars = buildCustomAccentCssVariables(colors);
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}
