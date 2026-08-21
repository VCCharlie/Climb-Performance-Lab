import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    resolveFlybyStravaId,
    fetchCanonicalStravaActivityId,
    openStravaFlybyForActivity,
} from '../../utils/stravaFlyby.js';

describe('resolveFlybyStravaId', () => {
    it('returns normalized strava id', () => {
        expect(resolveFlybyStravaId({ id: 'i12345', strava_id: '987654321' })).toBe('987654321');
    });

    it('rejects when strava_id digits match intervals row id', () => {
        expect(resolveFlybyStravaId({ id: '53534754', strava_id: '53534754' })).toBeNull();
    });

    it('returns null when strava_id missing', () => {
        expect(resolveFlybyStravaId({ id: '1' })).toBeNull();
    });
});

describe('fetchCanonicalStravaActivityId', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns canonical id from Strava API', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 123456789 }),
        });
        const result = await fetchCanonicalStravaActivityId('123456789', 'token');
        expect(result).toEqual({ ok: true, canonicalId: '123456789' });
    });

    it('reports not_found on 404', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 404 });
        const result = await fetchCanonicalStravaActivityId('999999999', 'token');
        expect(result).toEqual({ ok: false, reason: 'not_found', triedId: '999999999' });
    });
});

describe('openStravaFlybyForActivity', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns false when strava id invalid', async () => {
        const result = await openStravaFlybyForActivity({ id: '53534754', strava_id: '53534754' });
        expect(result).toBe(false);
    });

    it('opens flyby after validating with token', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 123456789 }),
        });
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

        const result = await openStravaFlybyForActivity(
            { id: 'i1', strava_id: '123456789' },
            { getStravaToken: async () => 'tok' },
        );

        expect(result).toBe(true);
        expect(clickSpy).toHaveBeenCalled();
    });
});
