import { describe, expect, it } from 'vitest';
import {
    getOrientationMismatch,
    isOrientationCompliant,
} from '../../utils/orientationPolicy';

describe('orientationPolicy', () => {
    it('requires portrait on mobile form factor', () => {
        expect(getOrientationMismatch({ mobile: true, portrait: true })).toBeNull();
        expect(getOrientationMismatch({ mobile: true, portrait: false })).toBe('portrait');
        expect(isOrientationCompliant({ mobile: true, portrait: false })).toBe(false);
    });

    it('requires landscape on desktop form factor', () => {
        expect(getOrientationMismatch({ mobile: false, portrait: false })).toBeNull();
        expect(getOrientationMismatch({ mobile: false, portrait: true })).toBe('landscape');
        expect(isOrientationCompliant({ mobile: false, portrait: true })).toBe(false);
    });
});
