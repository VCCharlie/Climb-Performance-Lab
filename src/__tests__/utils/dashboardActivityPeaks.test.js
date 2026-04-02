import { describe, it, expect } from 'vitest';
import { findBestPowerActivity, activityExternalLinks } from '../../utils/dashboardActivityPeaks';

describe('findBestPowerActivity', () => {
    it('picks max under cap', () => {
        const acts = [
            { id: 'a', date: '2026-01-01', best_20min: 200 },
            { id: 'b', date: '2026-01-02', best_20min: 250 },
        ];
        const r = findBestPowerActivity(acts, 'best_20min', 200);
        expect(r.watts).toBe(250);
        expect(r.activity.id).toBe('b');
    });

    it('ignores values above cap', () => {
        const acts = [{ id: 'a', date: '2026-01-01', best_20min: 500 }];
        const r = findBestPowerActivity(acts, 'best_20min', 200);
        expect(r.watts).toBe(0);
        expect(r.activity).toBeNull();
    });
});

describe('activityExternalLinks', () => {
    it('builds intervals and strava links', () => {
        const links = activityExternalLinks({ id: '12345', strava_id: '98765432' });
        expect(links.some((l) => l.href.includes('intervals.icu/activities/12345'))).toBe(true);
        expect(links.some((l) => l.href.includes('strava.com/activities/98765432'))).toBe(true);
    });
});
