/**
 * User-selectable accent palettes (orthogonal to light/dark).
 * Logo yellow (--cd-brand) is defined only in tokens.css and is not overridden here.
 */

import {
  applyCustomAccentOverrides,
  clearCustomAccentOverrides,
} from '../utils/customAccentColor.js';

export const ACCENT_PALETTE_STORAGE_KEY = 'accentPalette';
export const ACCENT_PALETTE_CUSTOM = 'custom';

/** Original app accent before optional palettes were added. */
export const DEFAULT_ACCENT_PALETTE = 'classic';

export const ACCENT_PALETTES = [
  {
    id: 'classic',
    label: 'Classic Orange',
    description: 'Original Climb Lab accent — same as before custom palettes.',
    swatches: ['#ea580c', '#fb923c', '#ffedd5'],
  },
  {
    id: 'alpine',
    label: 'Alpine Teal',
    description: 'Calm sea-glass tones — outdoor and easy on the eyes.',
    swatches: ['#2a7474', '#5ba3a3', '#e6f3f3'],
  },
  {
    id: 'indigo',
    label: 'Soft Indigo',
    description: 'Cool, modern analytics feel without harsh saturation.',
    swatches: ['#5b6fd6', '#8b9ae8', '#eef1fb'],
  },
  {
    id: 'plum',
    label: 'Warm Plum',
    description: 'Muted violet accent on neutral surfaces — soft and editorial.',
    swatches: ['#7c6b9e', '#a192c4', '#f3f0f7'],
  },
  {
    id: ACCENT_PALETTE_CUSTOM,
    label: 'Custom',
    description: 'Pick your own accent and fill colors (logo yellow stays fixed).',
    swatches: ['#ea580c', '#8b5cf6', '#e6f3f3'],
  },
];

const VALID_IDS = new Set(ACCENT_PALETTES.map((p) => p.id));

/** @param {string | null | undefined} id */
export function isValidAccentPalette(id) {
  return typeof id === 'string' && VALID_IDS.has(id);
}

export function readStoredAccentPalette() {
  if (typeof localStorage === 'undefined') return DEFAULT_ACCENT_PALETTE;
  try {
    const stored = localStorage.getItem(ACCENT_PALETTE_STORAGE_KEY);
    return isValidAccentPalette(stored) ? stored : DEFAULT_ACCENT_PALETTE;
  } catch {
    return DEFAULT_ACCENT_PALETTE;
  }
}

/**
 * @param {string} paletteId
 * @param {{ emphasis: string, fill: string } | null | undefined} [customColors]
 */
export function applyAccentPalette(paletteId, customColors) {
  if (typeof document === 'undefined') return;

  const id = isValidAccentPalette(paletteId) ? paletteId : DEFAULT_ACCENT_PALETTE;
  const root = document.documentElement;

  clearCustomAccentOverrides(root);

  if (id === DEFAULT_ACCENT_PALETTE) {
    root.removeAttribute('data-accent-palette');
    return;
  }

  root.setAttribute('data-accent-palette', id);

  if (id === ACCENT_PALETTE_CUSTOM && customColors) {
    applyCustomAccentOverrides(root, customColors);
  }
}
