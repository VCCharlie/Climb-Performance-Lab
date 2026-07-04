import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../../utils/safeLog.js';

describe('redactSecrets', () => {
    it('redacts known secret fields at any depth', () => {
        const input = {
            intervals: { apiKey: 'secret-key', athleteId: 'i123' },
            strava: { access_token: 'at', refresh_token: 'rt', client_id: '1' },
            body: { githubPat: 'ghp_xxx', ftp: 280 },
        };
        const out = redactSecrets(input);
        expect(out.intervals.apiKey).toBe('***REDACTED***');
        expect(out.intervals.athleteId).toBe('i123');
        expect(out.strava.access_token).toBe('***REDACTED***');
        expect(out.body.githubPat).toBe('***REDACTED***');
        expect(out.body.ftp).toBe(280);
    });

    it('leaves empty secret fields unchanged', () => {
        const out = redactSecrets({ apiKey: '' });
        expect(out.apiKey).toBe('');
    });
});
