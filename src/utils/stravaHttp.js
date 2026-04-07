/**
 * Strava REST helpers: rate limits and user-facing errors.
 */

/**
 * @param {Response} resp
 * @returns {number | null} Whole minutes to suggest waiting (null if not 429).
 */
export function stravaRateLimitWaitMinutes(resp) {
    if (!resp || resp.status !== 429) return null;
    const ra = resp.headers.get('Retry-After');
    if (ra != null && ra !== '') {
        const n = Number(ra);
        if (!Number.isNaN(n) && n > 0) {
            // Retry-After is usually seconds
            return Math.max(1, Math.ceil(n / 60));
        }
    }
    return 15;
}

/**
 * @param {Response} resp
 * @returns {string}
 */
export function stravaHttpErrorMessage(resp, fallback = 'Request failed') {
    if (!resp) return fallback;
    if (resp.status === 429) {
        const m = stravaRateLimitWaitMinutes(resp);
        return m != null
            ? `Strava rate limit (429). Try again in about ${m} minute(s).`
            : 'Strava rate limit (429). Try again in a few minutes.';
    }
    return `${fallback} (${resp.status})`;
}
