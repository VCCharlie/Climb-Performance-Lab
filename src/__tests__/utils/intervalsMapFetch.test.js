import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    encodeGooglePolyline,
    fetchIntervalsActivityMapPolylineDetailed,
} from '../../utils/intervalsMapFetch.js';
import { MAP_BACKFILL_CODE } from '../../utils/intervalsMapBackfillCodes.js';

describe('encodeGooglePolyline', () => {
    it('encodes a short lat/lng path', () => {
        const encoded = encodeGooglePolyline([
            [52.1, 5.1],
            [52.1001, 5.1002],
        ]);
        expect(encoded).toBeTruthy();
        expect(typeof encoded).toBe('string');
    });

    it('returns null for empty input', () => {
        expect(encodeGooglePolyline([])).toBeNull();
    });
});

describe('fetchIntervalsActivityMapPolylineDetailed', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('falls back to streams when /map fetch throws', async () => {
        const fetchMock = vi.fn(async (url) => {
            if (String(url).includes('/map')) {
                throw new TypeError('Failed to fetch');
            }
            return {
                ok: true,
                status: 200,
                json: async () => [{ type: 'latlng', data: [[52.1, 5.1], [52.1001, 5.1002]] }],
            };
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchIntervalsActivityMapPolylineDetailed('i123', { apiKey: 'test-key' });
        expect(result.polyline).toBeTruthy();
        expect(result.code).toBe(MAP_BACKFILL_CODE.ADDED);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
