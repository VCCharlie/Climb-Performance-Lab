import { describe, it, expect } from 'vitest';
import { defaultStravaVsLogUi, mergeStravaVsLogUi } from '../../utils/stravaVsLogUi.js';

describe('stravaVsLogUi', () => {
    it('defaultStravaVsLogUi returns valid dates and booleans', () => {
        const d = defaultStravaVsLogUi();
        expect(d.startYmd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(d.endYmd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof d.includeEbikeRide).toBe('boolean');
        expect(typeof d.useFuzzyMatch).toBe('boolean');
    });

    it('mergeStravaVsLogUi fills invalid strings from defaults', () => {
        const m = mergeStravaVsLogUi({
            startYmd: 'not-a-date',
            endYmd: '2024-06-01',
            includeEbikeRide: false,
            useFuzzyMatch: true,
        });
        const d = defaultStravaVsLogUi();
        expect(m.startYmd).toBe(d.startYmd);
        expect(m.endYmd).toBe('2024-06-01');
        expect(m.includeEbikeRide).toBe(false);
        expect(m.useFuzzyMatch).toBe(true);
    });
});
