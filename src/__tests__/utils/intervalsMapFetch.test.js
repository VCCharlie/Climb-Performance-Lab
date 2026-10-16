import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    encodeGooglePolyline,
    fetchIntervalsActivityMapPolylineDetailed,
    latLngPairsFromIntervalsStream,
    flattenLatLngPoints,
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

describe('latLngPairsFromIntervalsStream', () => {
    it('combines parallel latitude (data) and longitude (data2) arrays', () => {
        const pairs = latLngPairsFromIntervalsStream({
            type: 'latlng',
            data: [52.08, 52.081, 52.082],
            data2: [4.31, 4.311, 4.312],
        });
        expect(pairs).toEqual([
            [52.08, 4.31],
            [52.081, 4.311],
            [52.082, 4.312],
        ]);
    });

    it('skips null gaps in map latlngs', () => {
        const pairs = flattenLatLngPoints([
            null,
            [52.1, 4.3],
            [52.1001, 4.3002],
        ]);
        expect(pairs).toHaveLength(2);
    });
});

describe('fetchIntervalsActivityMapPolylineDetailed', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads latlng stream with data + data2', async () => {
        const fetchMock = vi.fn(async (url) => {
            if (String(url).includes('/map')) {
                return { ok: false, status: 404, json: async () => ({}) };
            }
            return {
                ok: true,
                status: 200,
                json: async () => [{
                    type: 'latlng',
                    data: [52.08, 52.09],
                    data2: [4.31, 4.32],
                }],
            };
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchIntervalsActivityMapPolylineDetailed('i123786160', { apiKey: 'test-key' });
        expect(result.polyline).toBeTruthy();
        expect(result.code).toBe(MAP_BACKFILL_CODE.ADDED);
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
