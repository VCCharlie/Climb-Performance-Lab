import { describe, it, expect } from 'vitest';
import {
    normalizeHexColor,
    buildCustomAccentCssVariables,
    normalizeCustomAccentColors,
} from '../../utils/customAccentColor';

describe('customAccentColor', () => {
    it('normalizes 3- and 6-digit hex', () => {
        expect(normalizeHexColor('#ea5')).toBe('#eeaa55');
        expect(normalizeHexColor('ea580c')).toBe('#ea580c');
        expect(normalizeHexColor('nope')).toBeNull();
    });

    it('normalizes stored custom pair', () => {
        expect(normalizeCustomAccentColors({ emphasis: '#ea580c', fill: '#fb923c' })).toEqual({
            emphasis: '#ea580c',
            fill: '#fb923c',
        });
        expect(normalizeCustomAccentColors({ emphasis: 'not-a-color', fill: '#ffffff' })).toBeNull();
    });

    it('builds CSS variables for custom accent', () => {
        const vars = buildCustomAccentCssVariables({ emphasis: '#2a7474', fill: '#5ba3a3' });
        expect(vars['--cd-accent-emphasis']).toBe('#2a7474');
        expect(vars['--cd-primary']).toBe('#5ba3a3');
        expect(vars['--cd-primary-rgb']).toBe('91 163 163');
    });
});
