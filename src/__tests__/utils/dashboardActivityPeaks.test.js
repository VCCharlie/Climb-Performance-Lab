import { describe, it, expect } from 'vitest';
import {
    findBestPowerActivity,
    activityExternalLinks,
    findPeakEftp20Activity,
    findPeakEftp60Activity,
    deriveEftp20FromActivity,
} from '../../utils/dashboardActivityPeaks';

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

describe('findPeakEftp20Activity', () => {
    it('picks activity with highest derived eFTP (20m)', () => {
        const acts = [
            { id: 'a', date: '2026-01-01', best_20min: 200 },
            { id: 'b', date: '2026-01-02', best_20min: 300 },
        ];
        const r = findPeakEftp20Activity(acts);
        expect(r.derivedWatts).toBe(285);
        expect(r.best20Raw).toBe(300);
        expect(r.activity.id).toBe('b');
    });

    it('excludes values that yield eFTP above 600W', () => {
        const acts = [{ id: 'a', date: '2026-01-01', best_20min: 700 }];
        const r = findPeakEftp20Activity(acts);
        expect(r.activity).toBeNull();
        expect(r.derivedWatts).toBe(0);
    });

    it('tie-breaks on newer date', () => {
        const acts = [
            { id: 'old', date: '2026-01-01', best_20min: 300 },
            { id: 'new', date: '2026-06-01', best_20min: 300 },
        ];
        const r = findPeakEftp20Activity(acts);
        expect(r.activity.id).toBe('new');
    });
});

describe('findPeakEftp60Activity', () => {
    it('picks activity with highest rounded 60m power under cap', () => {
        const acts = [
            { id: 'a', date: '2026-01-01', best_60min: 250 },
            { id: 'b', date: '2026-01-02', best_60min: 270 },
        ];
        const r = findPeakEftp60Activity(acts);
        expect(r.derivedWatts).toBe(270);
        expect(r.activity.id).toBe('b');
    });

    it('excludes 60m power above 600W', () => {
        const acts = [{ id: 'a', date: '2026-01-01', best_60min: 650 }];
        const r = findPeakEftp60Activity(acts);
        expect(r.activity).toBeNull();
    });
});

describe('deriveEftp20FromActivity', () => {
    it('returns null when result would exceed 600W', () => {
        expect(deriveEftp20FromActivity({ best_20min: 700 })).toBeNull();
    });
});

describe('activityExternalLinks', () => {
    it('builds intervals, strava, and flyby links', () => {
        const links = activityExternalLinks({ id: '12345', strava_id: '98765432', strava_map: 'abc123poly' });
        expect(links.some((l) => l.href.includes('intervals.icu/activities/12345'))).toBe(true);
        expect(links.some((l) => l.href.includes('strava.com/activities/98765432'))).toBe(true);
        const flyby = links.find((l) => l.label === 'Flyby');
        expect(flyby?.href).toBe('https://labs.strava.com/flyby/viewer/#98765432');
        expect(flyby?.href).not.toContain('abc123poly');
    });
});
