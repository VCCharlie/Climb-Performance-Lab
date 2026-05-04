import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    slimStravaActivityForVsLogCache,
    writeStravaVsLogScanCache,
    readStravaVsLogScanCache,
    clearStravaVsLogScanCache,
    STRAVA_VS_LOG_SCAN_CACHE_VERSION,
} from '../../utils/stravaVsLogScanCache.js';

describe('stravaVsLogScanCache', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            _m: new Map(),
            getItem(k) {
                return this._m.has(k) ? this._m.get(k) : null;
            },
            setItem(k, v) {
                this._m.set(k, v);
            },
            removeItem(k) {
                this._m.delete(k);
            },
        });
    });

    it('slimStravaActivityForVsLogCache keeps matching fields', () => {
        const s = slimStravaActivityForVsLogCache({
            id: 1,
            name: 'Morning ride',
            distance: 12345,
            moving_time: 3600,
            sport_type: 'Ride',
            start_date_local: '2024-01-02T08:00:00',
        });
        expect(s.id).toBe(1);
        expect(s.name).toBe('Morning ride');
        expect(s.distance).toBe(12345);
    });

    it('writeStravaVsLogScanCache and readStravaVsLogScanCache roundtrip', () => {
        const acts = [
            { id: 10, name: 'A', distance: 1000, moving_time: 600, sport_type: 'Ride', start_date_local: '2024-06-01T10:00:00' },
        ];
        const w = writeStravaVsLogScanCache('12345', acts, false);
        expect(w.ok).toBe(true);
        const r = readStravaVsLogScanCache('12345');
        expect(r).not.toBeNull();
        expect(r.historyComplete).toBe(false);
        expect(r.activities).toHaveLength(1);
        expect(r.activities[0].id).toBe(10);
    });

    it('readStravaVsLogScanCache returns null for wrong version', () => {
        localStorage.setItem('stravaVsLogScan_v1_1_99', JSON.stringify({ v: 0, athleteId: '99', activities: [] }));
        expect(readStravaVsLogScanCache('99')).toBeNull();
    });

    it('clearStravaVsLogScanCache removes entry', () => {
        writeStravaVsLogScanCache('7', [{ id: 1, distance: 1, moving_time: 1, sport_type: 'Ride', start_date_local: '2020-01-01' }], true);
        clearStravaVsLogScanCache('7');
        expect(readStravaVsLogScanCache('7')).toBeNull();
    });

    it('STRAVA_VS_LOG_SCAN_CACHE_VERSION is stable', () => {
        expect(STRAVA_VS_LOG_SCAN_CACHE_VERSION).toBe(1);
    });
});
