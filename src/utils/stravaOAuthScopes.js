/**
 * Strava OAuth scope helpers — private activities require activity:read_all.
 */

export const STRAVA_SCOPE_PRIVATE_READ = 'activity:read_all';

/** Scopes requested on new Strava connections (read + private activity access). */
export const STRAVA_OAUTH_REQUEST_SCOPES = `read,${STRAVA_SCOPE_PRIVATE_READ}`;

/**
 * @param {string | null | undefined} scopeParam — comma-separated scopes from OAuth redirect or stored config
 * @returns {boolean}
 */
export function scopeGrantsPrivateActivityRead(scopeParam) {
    const raw = String(scopeParam || '').trim();
    if (!raw) return false;
    return raw.split(',').some((s) => s.trim() === STRAVA_SCOPE_PRIVATE_READ);
}

/**
 * @param {{ scopes?: string | null, has_private_read?: boolean | null } | null | undefined} stravaConfig
 * @returns {boolean | null} true/false when known, null when scope was never recorded (legacy connect)
 */
export function stravaConfigHasPrivateRead(stravaConfig) {
    if (!stravaConfig) return null;
    if (stravaConfig.has_private_read === true) return true;
    if (stravaConfig.has_private_read === false) return false;
    if (stravaConfig.scopes) {
        return scopeGrantsPrivateActivityRead(stravaConfig.scopes);
    }
    return null;
}

export const STRAVA_RECONNECT_PRIVATE_READ_MSG =
    'Reconnect Strava in Settings so the app can read your private activities (requires activity:read_all).';
