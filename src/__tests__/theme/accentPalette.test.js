import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    ACCENT_PALETTES,
    DEFAULT_ACCENT_PALETTE,
    applyAccentPalette,
    isValidAccentPalette,
    readStoredAccentPalette,
    ACCENT_PALETTE_STORAGE_KEY,
} from '../../theme/accentPalette.js';

describe('accentPalette', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-accent-palette');
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-accent-palette');
    });

    it('validates known palette ids', () => {
        ACCENT_PALETTES.forEach((p) => {
            expect(isValidAccentPalette(p.id)).toBe(true);
        });
        expect(isValidAccentPalette('neon')).toBe(false);
    });

    it('reads default when storage empty or invalid', () => {
        expect(readStoredAccentPalette()).toBe(DEFAULT_ACCENT_PALETTE);
        localStorage.setItem(ACCENT_PALETTE_STORAGE_KEY, 'alpine');
        expect(readStoredAccentPalette()).toBe('alpine');
        localStorage.setItem(ACCENT_PALETTE_STORAGE_KEY, 'invalid');
        expect(readStoredAccentPalette()).toBe(DEFAULT_ACCENT_PALETTE);
    });

    it('applyAccentPalette sets data attribute for non-default palettes', () => {
        applyAccentPalette('indigo');
        expect(document.documentElement.getAttribute('data-accent-palette')).toBe('indigo');
        applyAccentPalette('classic');
        expect(document.documentElement.hasAttribute('data-accent-palette')).toBe(false);
    });

    it('applyAccentPalette custom sets attribute and inline emphasis', () => {
        applyAccentPalette('custom', { emphasis: '#2a7474', fill: '#5ba3a3' });
        expect(document.documentElement.getAttribute('data-accent-palette')).toBe('custom');
        expect(document.documentElement.style.getPropertyValue('--cd-accent-emphasis')).toBe('#2a7474');
        applyAccentPalette('classic');
    });
});
