import { describe, it, expect } from 'vitest';
import { computeAnchoredOverlayStyle } from '../../utils/anchoredOverlayPosition.js';

describe('computeAnchoredOverlayStyle', () => {
    it('places menu below anchor when space allows', () => {
        const rect = {
            top: 100,
            bottom: 140,
            left: 20,
            right: 200,
            width: 180,
            height: 40,
        };
        const style = computeAnchoredOverlayStyle(rect, { minWidth: 200, align: 'start' });
        expect(style.placement).toBe('below');
        expect(style.top).toBe('144px');
        expect(style.position).toBe('fixed');
        expect(style.zIndex).toBe(200);
    });

    it('flips above anchor when viewport bottom is tight', () => {
        const rect = {
            top: 700,
            bottom: 740,
            left: 16,
            right: 300,
            width: 284,
            height: 40,
        };
        const style = computeAnchoredOverlayStyle(rect, { minWidth: 200, align: 'start' });
        expect(style.placement).toBe('above');
        expect(style.bottom).toBeTruthy();
        expect(style.top).toBe('auto');
    });

    it('clamps horizontal position inside viewport margins', () => {
        const rect = {
            top: 80,
            bottom: 120,
            left: 2,
            right: 40,
            width: 38,
            height: 40,
        };
        const style = computeAnchoredOverlayStyle(rect, { minWidth: 224, align: 'end' });
        expect(parseInt(style.left, 10)).toBeGreaterThanOrEqual(8);
    });
});
