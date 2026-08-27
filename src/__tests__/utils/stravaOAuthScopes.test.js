import { describe, it, expect } from 'vitest';
import {
    scopeGrantsPrivateActivityRead,
    stravaConfigHasPrivateRead,
    STRAVA_OAUTH_REQUEST_SCOPES,
} from '../../utils/stravaOAuthScopes';

describe('stravaOAuthScopes', () => {
    it('STRAVA_OAUTH_REQUEST_SCOPES includes activity:read_all', () => {
        expect(STRAVA_OAUTH_REQUEST_SCOPES).toContain('activity:read_all');
    });

    it('scopeGrantsPrivateActivityRead detects read_all', () => {
        expect(scopeGrantsPrivateActivityRead('read,activity:read_all')).toBe(true);
        expect(scopeGrantsPrivateActivityRead('read,activity:read')).toBe(false);
    });

    it('stravaConfigHasPrivateRead reads stored flags', () => {
        expect(stravaConfigHasPrivateRead({ has_private_read: true })).toBe(true);
        expect(stravaConfigHasPrivateRead({ has_private_read: false })).toBe(false);
        expect(stravaConfigHasPrivateRead({ scopes: 'read,activity:read_all' })).toBe(true);
        expect(stravaConfigHasPrivateRead({ athlete_id: 1 })).toBeNull();
    });
});
