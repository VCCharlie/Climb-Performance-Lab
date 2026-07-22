/**
 * Strava OAuth URL helpers — strip stale ?code= params after logout or expired flows.
 */

const STRAVA_OAUTH_STATE_KEY = 'strava_oauth_state';

/** True when the current URL looks like a Strava OAuth redirect. */
export function hasStravaOAuthReturnInUrl() {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('code');
}

/**
 * Remove Strava OAuth query params without reloading the page.
 * Call only after `completeGoogleRedirectIfNeeded()` — Google redirect sign-in
 * uses the same ?code=&state= shape and must consume those params first.
 */
export function stripStravaOAuthParamsFromUrl() {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('code') && !url.searchParams.has('state')) {
        return false;
    }
    url.searchParams.delete('code');
    url.searchParams.delete('scope');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
    return true;
}

/**
 * Pending connect flow started in this tab (state stored before redirect to Strava).
 */
export function hasPendingStravaOAuthState() {
    if (typeof sessionStorage === 'undefined') return false;
    return Boolean(sessionStorage.getItem(STRAVA_OAUTH_STATE_KEY));
}

export function clearPendingStravaOAuthState() {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(STRAVA_OAUTH_STATE_KEY);
}

export { STRAVA_OAUTH_STATE_KEY };
