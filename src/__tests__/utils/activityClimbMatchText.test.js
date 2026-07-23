import { describe, it, expect } from 'vitest';
import { isAppGeneratedClimbHint, stripAppGeneratedClimbHint } from '../../utils/activityClimbMatchText';

describe('activityClimbMatchText', () => {
    it('detects app Similar to climb hints', () => {
        expect(isAppGeneratedClimbHint('Similar to Col du Platzerwasel')).toBe(true);
        expect(isAppGeneratedClimbHint('  similar to Alpe d Huez  ')).toBe(true);
        expect(isAppGeneratedClimbHint('MyCols: Alpe d Huez')).toBe(false);
        expect(isAppGeneratedClimbHint('Morning ride')).toBe(false);
    });

    it('stripAppGeneratedClimbHint clears hint text', () => {
        expect(stripAppGeneratedClimbHint('Similar to Mont Ventoux')).toBe('');
        expect(stripAppGeneratedClimbHint('Cols: Stelvio')).toBe('Cols: Stelvio');
    });
});
