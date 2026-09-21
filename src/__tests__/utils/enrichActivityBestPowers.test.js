import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichActivitiesWithBestPowerEfforts } from '../../utils/enrichActivityBestPowers';

describe('enrichActivitiesWithBestPowerEfforts', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('fills 90/120 min from Strava streams when 1–60 min are already present', async () => {
        fetch.mockImplementation(async (url) => {
            const u = String(url);
            if (u.includes('power-curve')) {
                return { ok: false, status: 404, json: async () => ({}) };
            }
            if (u.includes('/streams?')) {
                const watts = Array.from({ length: 7200 }, (_, i) => (i >= 400 && i < 5800 ? 240 : 200));
                return {
                    ok: true,
                    json: async () => ({
                        time: { data: watts.map((_, i) => i) },
                        watts: { data: watts },
                    }),
                };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        });

        const [out] = await enrichActivitiesWithBestPowerEfforts(
            [{
                id: 'i123',
                strava_id: '99112233',
                moving_time: 7200,
                best_1min: 445,
                best_5min: 300,
                best_10min: 264,
                best_20min: 264,
                best_60min: 243,
                best_90min: 0,
                best_120min: 0,
            }],
            {
                intervalsConfig: { apiKey: 'secret' },
                stravaToken: 'token',
                maxFetches: 1,
                delayMs: 0,
            },
        );

        expect(out.best_90min).toBeGreaterThanOrEqual(230);
        expect(out.best_120min).toBeGreaterThanOrEqual(200);
    });
});
