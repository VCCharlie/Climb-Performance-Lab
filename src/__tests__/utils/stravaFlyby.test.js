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

    it('rejects when strava_id digits match intervals numeric row id', () => {
        expect(resolveFlybyStravaId({ id: '53534754', strava_id: '53534754' })).toBeNull();
    });

    it('does not reject prefixed activity id that shares digits with strava_id', () => {
        expect(resolveFlybyStravaId({ id: 'i14163440910', strava_id: '14163440910' })).toBe('14163440910');
    });

    it('falls back to external_id when strava_id is mislinked', () => {
        expect(
            resolveFlybyStravaId({
                id: '53534754',
                strava_id: '53534754',
                external_id: 'strava-14163440910',
            }),
        ).toBe('14163440910');
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

    it('opens flyby after validating with token (placeholder tab before async)', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 123456789 }),
        });
        const location = { href: 'about:blank' };
        const openSpy = vi.spyOn(window, 'open').mockReturnValue({
            closed: false,
            opener: window,
            location,
            close: vi.fn(),
        });

        const result = await openStravaFlybyForActivity(
            { id: 'i1', strava_id: '123456789' },
            { getStravaToken: async () => 'tok' },
        );

        expect(result).toBe(true);
        expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
        expect(location.href).toBe('https://labs.strava.com/flyby/viewer/#123456789');
    });

    it('still opens flyby when Strava API returns 404 (preflight best-effort)', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 404 });
        const location = { href: 'about:blank' };
        vi.spyOn(window, 'open').mockReturnValue({
            closed: false,
            opener: window,
            location,
            close: vi.fn(),
        });

        const result = await openStravaFlybyForActivity(
            { id: 'i1', strava_id: '123456789' },
            { getStravaToken: async () => 'tok' },
        );

        expect(result).toBe(true);
        expect(location.href).toBe('https://labs.strava.com/flyby/viewer/#123456789');
    });
});
