/**
 * Browser-only cache for the full Strava bike activity list used by
 * Activities → Strava profile → Vs log → "Refresh Strava ride list".
 * Not synced to Firestore (payload size); survives tab refresh on the same device.
 */

export const STRAVA_VS_LOG_SCAN_CACHE_VERSION = 1;

const STORAGE_PREFIX = 'stravaVsLogScan_v';

/** @param {string | number | null | undefined} athleteId */
export function stravaVsLogScanCacheKey(athleteId) {
    if (athleteId == null || athleteId === '') return null;
    return `${STORAGE_PREFIX}${STRAVA_VS_LOG_SCAN_CACHE_VERSION}_${String(athleteId)}`;
}

/**
 * Fields needed for computeStravaVsLogGap and the missing-rides table.
 * @param {object} a raw Strava list activity
 * @param {{ includeName?: boolean }} opts
 */
export function slimStravaActivityForVsLogCache(a, opts = {}) {
    const includeName = opts.includeName !== false;
    const rawName = a?.name != null ? String(a.name) : '';
    const name = includeName && rawName.length > 200 ? `${rawName.slice(0, 197)}…` : rawName;
    const o = {
        id: a.id,
        distance: a.distance,
        moving_time: a.moving_time,
        sport_type: a.sport_type,
        type: a.type,
        start_date: a.start_date,
        start_date_local: a.start_date_local,
    };
    if (includeName) o.name = name;
    return o;
}

/**
 * @param {string | number} athleteId
 * @param {object[]} activities slimmed activities
 * @param {boolean} historyComplete
 * @returns {{ ok: boolean, reason?: 'quota' | 'serialize', fetchedAt?: string }} ok false if nothing was written
 */
export function writeStravaVsLogScanCache(athleteId, activities, historyComplete) {
    const key = stravaVsLogScanCacheKey(athleteId);
    if (!key || typeof localStorage === 'undefined') return { ok: false, reason: 'serialize' };

    const fetchedAt = new Date().toISOString();
    const tryPayload = (slimFn) => {
        const slimmed = (activities || []).map((a) => slimFn(a));
        return JSON.stringify({
            v: STRAVA_VS_LOG_SCAN_CACHE_VERSION,
            athleteId: String(athleteId),
            historyComplete: !!historyComplete,
            fetchedAt,
            activities: slimmed,
        });
    };

    let json;
    try {
        json = tryPayload((a) => slimStravaActivityForVsLogCache(a, { includeName: true }));
    } catch {
        return { ok: false, reason: 'serialize' };
    }

    const attempt = (payload) => {
        try {
            localStorage.setItem(key, payload);
            return true;
        } catch (e) {
            if (e && (e.name === 'QuotaExceededError' || e.code === 22)) return false;
            return false;
        }
    };

    if (attempt(json)) return { ok: true, fetchedAt };

    try {
        json = tryPayload((a) => slimStravaActivityForVsLogCache(a, { includeName: false }));
    } catch {
        return { ok: false, reason: 'serialize' };
    }
    if (attempt(json)) return { ok: true, fetchedAt };

    return { ok: false, reason: 'quota' };
}

/**
 * @param {string | number} athleteId
 * @returns {{ activities: object[], historyComplete: boolean, fetchedAt: string } | null}
 */
export function readStravaVsLogScanCache(athleteId) {
    const key = stravaVsLogScanCacheKey(athleteId);
    if (!key || typeof localStorage === 'undefined') return null;
    let raw;
    try {
        raw = localStorage.getItem(key);
    } catch {
        return null;
    }
    if (!raw) return null;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!parsed || parsed.v !== STRAVA_VS_LOG_SCAN_CACHE_VERSION) return null;
    if (String(parsed.athleteId) !== String(athleteId)) return null;
    if (!Array.isArray(parsed.activities)) return null;
    return {
        activities: parsed.activities,
        historyComplete: !!parsed.historyComplete,
        fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : '',
    };
}

/** @param {string | number} athleteId */
export function clearStravaVsLogScanCache(athleteId) {
    const key = stravaVsLogScanCacheKey(athleteId);
    if (!key || typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch { /* ignore */ }
}
