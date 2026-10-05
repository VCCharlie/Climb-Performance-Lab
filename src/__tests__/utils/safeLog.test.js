import { describe, it, expect } from 'vitest';
import { devLog, devWarn, isViteDevBuild, redactSecrets } from '../../utils/safeLog.js';

describe('safeLog', () => {
    it('redactSecrets masks known secret fields', () => {
        const out = redactSecrets({ apiKey: 'secret', title: 'Ride' });
        expect(out.apiKey).toBe('***REDACTED***');
        expect(out.title).toBe('Ride');
    });

    it('isViteDevBuild is false when Vite env is missing (Node nightly sync)', () => {
        expect(isViteDevBuild(null)).toBe(false);
        expect(isViteDevBuild({})).toBe(false);
        expect(isViteDevBuild({ DEV: false })).toBe(false);
        expect(isViteDevBuild({ DEV: true })).toBe(true);
    });

    it('devLog and devWarn never throw', () => {
        expect(() => devLog('[test] hello')).not.toThrow();
        expect(() => devWarn('[test] warn')).not.toThrow();
    });
});
