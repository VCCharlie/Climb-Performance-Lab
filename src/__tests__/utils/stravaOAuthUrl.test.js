import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    hasStravaOAuthReturnInUrl,
    hasPendingStravaOAuthState,
    stripStravaOAuthParamsFromUrl,
    STRAVA_OAUTH_STATE_KEY,
} from '../../utils/stravaOAuthUrl.js';

describe('stravaOAuthUrl', () => {
    const originalHref = window.location.href;

    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        window.history.replaceState({}, '', originalHref);
        sessionStorage.clear();
    });

    it('detects Strava OAuth return params in URL', () => {
        window.history.replaceState({}, '', `${window.location.origin}/app?code=abc&state=xyz`);
        expect(hasStravaOAuthReturnInUrl()).toBe(true);
    });

    it('strips OAuth params from URL', () => {
        window.history.replaceState({}, '', `${window.location.origin}/app?code=abc&state=xyz&scope=read`);
        expect(stripStravaOAuthParamsFromUrl()).toBe(true);
        expect(window.location.search).toBe('');
    });

    it('reports pending OAuth state in sessionStorage', () => {
        sessionStorage.setItem(STRAVA_OAUTH_STATE_KEY, 'pending');
        expect(hasPendingStravaOAuthState()).toBe(true);
    });
});
