/**
 * Tests for src/utils/intervalsZoneTimesEnrich.js
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    activityNeedsZoneTimesEnrich,
    enrichActivitiesWithZoneTimes,
    fetchIntervalsActivityDetail,
} from '../../utils/intervalsZoneTimesEnrich';

describe('activityNeedsZoneTimesEnrich', () => {
    it('returns true when power exists but zone times are missing', () => {
        expect(activityNeedsZoneTimesEnrich({
            id: 'i123',
            avg_power: 200,
        })).toBe(true);
    });

    it('returns false when zone times already present', () => {
        expect(activityNeedsZoneTimesEnrich({
            id: 'i123',
            avg_power: 200,
            power_zone_sec: [0, 3600, 0, 0, 0, 0, 0],
        })).toBe(false);
    });

    it('returns false without activity id or power data', () => {
        expect(activityNeedsZoneTimesEnrich({ avg_power: 200 })).toBe(false);
        expect(activityNeedsZoneTimesEnrich({ id: 'i1', avg_power: 0, norm_power: 0 })).toBe(false);
    });
});

describe('fetchIntervalsActivityDetail', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns null without api key', async () => {
        const result = await fetchIntervalsActivityDetail('i99', {});
        expect(result).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('fetches activity detail with basic auth', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'i99', icu_zone_times: [{ id: 'Z2', secs: 1200 }] }),
        });

        const result = await fetchIntervalsActivityDetail('i99', { apiKey: 'secret-key' });
        expect(result?.id).toBe('i99');

        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('https://intervals.icu/api/v1/activity/i99');
        expect(init.headers.Authorization).toMatch(/^Basic /);
    });
});

describe('enrichActivitiesWithZoneTimes', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('enriches activities missing zone times via detail endpoint', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: 'i100',
                icu_zone_times: [
                    { id: 'Z1', secs: 600 },
                    { id: 'Z2', secs: 2400 },
                ],
                icu_ftp: 250,
            }),
        });

        const activities = [
            { id: 'i100', date: '2026-08-04', avg_power: 180, ftp: 250 },
            { id: 'i101', date: '2026-08-05', avg_power: 0 },
        ];

        const { activities: out, enrichedCount } = await enrichActivitiesWithZoneTimes(
            activities,
            { apiKey: 'test-key' },
            { maxFetches: 5, delayMs: 0 },
        );

        expect(enrichedCount).toBe(1);
        expect(out[0].power_zone_sec).toEqual([600, 2400, 0, 0, 0, 0, 0]);
        expect(out[0].zone_times_source).toBe('intervals');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('skips activities that already have zone times', async () => {
        const activities = [
            {
                id: 'i200',
                avg_power: 200,
                power_zone_sec: [0, 5000, 0, 0, 0, 0, 0],
            },
        ];

        const { enrichedCount } = await enrichActivitiesWithZoneTimes(
            activities,
            { apiKey: 'test-key' },
            { maxFetches: 5, delayMs: 0 },
        );

        expect(enrichedCount).toBe(0);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('prefers recent rides when maxFetches is capped', async () => {
        fetch.mockImplementation(async (url) => ({
            ok: true,
            json: async () => {
                const id = String(url).split('/').pop();
                return {
                    id,
                    icu_zone_times: [{ id: 'Z2', secs: 1000 }],
                };
            },
        }));

        const activities = [
            { id: 'old', date: '2026-08-01', avg_power: 150 },
            { id: 'new', date: '2026-08-20', avg_power: 160 },
        ];

        const { activities: out, enrichedCount } = await enrichActivitiesWithZoneTimes(
            activities,
            { apiKey: 'test-key' },
            { maxFetches: 1, delayMs: 0 },
        );

        expect(enrichedCount).toBe(1);
        expect(out.find((a) => a.id === 'new')?.power_zone_sec?.[1]).toBe(1000);
        expect(out.find((a) => a.id === 'old')?.power_zone_sec).toBeUndefined();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('respects maxFetches cap', async () => {
        fetch.mockImplementation(async (url) => ({
            ok: true,
            json: async () => {
                const id = String(url).split('/').pop();
                return {
                    id,
                    icu_zone_times: [{ id: 'Z2', secs: 1000 }],
                };
            },
        }));

        const activities = [
            { id: 'a1', avg_power: 150 },
            { id: 'a2', avg_power: 160 },
            { id: 'a3', avg_power: 170 },
        ];

        const { enrichedCount } = await enrichActivitiesWithZoneTimes(
            activities,
            { apiKey: 'test-key' },
            { maxFetches: 2, delayMs: 0 },
        );

        expect(enrichedCount).toBe(2);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
