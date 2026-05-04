import { defaultGapRangeYtd } from './stravaVsLogGap';

/**
 * Persisted UI state for Activities → Strava profile → Vs log (no activity payloads).
 * @typedef {{
 *   startYmd: string,
 *   endYmd: string,
 *   includeEbikeRide: boolean,
 *   useFuzzyMatch: boolean,
 * }} StravaVsLogUiShape
 */

/** @returns {StravaVsLogUiShape} */
export function defaultStravaVsLogUi() {
    const y = defaultGapRangeYtd();
    return {
        startYmd: y.startYmd,
        endYmd: y.endYmd,
        includeEbikeRide: true,
        useFuzzyMatch: false,
    };
}

/** @param {unknown} raw @returns {StravaVsLogUiShape} */
export function mergeStravaVsLogUi(raw) {
    const d = defaultStravaVsLogUi();
    if (!raw || typeof raw !== 'object') return d;
    const o = /** @type {Record<string, unknown>} */ (raw);
    const sy = o.startYmd;
    const ey = o.endYmd;
    return {
        startYmd: typeof sy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sy) ? sy : d.startYmd,
        endYmd: typeof ey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ey) ? ey : d.endYmd,
        includeEbikeRide: typeof o.includeEbikeRide === 'boolean' ? o.includeEbikeRide : d.includeEbikeRide,
        useFuzzyMatch: typeof o.useFuzzyMatch === 'boolean' ? o.useFuzzyMatch : d.useFuzzyMatch,
    };
}
