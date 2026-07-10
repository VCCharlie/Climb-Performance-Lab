import { describe, it, expect, beforeEach } from 'vitest';
import {
    clearSensitiveLocalStorage,
    SENSITIVE_LOCAL_STORAGE_KEYS,
    getDefaultUserSettings,
    getDefaultIntervalsConfig,
    getDefaultStravaConfig,
    markExplicitSignOut,
    consumeExplicitSignOut,
    EXPLICIT_SIGN_OUT_SESSION_KEY,
} from '../../utils/sessionData.js';

describe('sessionData', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('clearSensitiveLocalStorage removes known keys and prefixed caches', () => {
        for (const key of SENSITIVE_LOCAL_STORAGE_KEYS) {
            localStorage.setItem(key, 'x');
        }
        localStorage.setItem('intervals_data_2024-01-01_2024-12-31', '{}');
        localStorage.setItem('stravaVsLogScan_v1_42', '{}');
        localStorage.setItem('theme', 'dark');
        localStorage.setItem('pwa_install_banner_dismissed', '1');

        clearSensitiveLocalStorage();

        for (const key of SENSITIVE_LOCAL_STORAGE_KEYS) {
            expect(localStorage.getItem(key)).toBeNull();
        }
        expect(localStorage.getItem('intervals_data_2024-01-01_2024-12-31')).toBeNull();
        expect(localStorage.getItem('stravaVsLogScan_v1_42')).toBeNull();
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(localStorage.getItem('pwa_install_banner_dismissed')).toBe('1');
    });

    it('default factories return empty sensitive fields', () => {
        expect(getDefaultUserSettings().openweatherApiKey).toBe('');
        expect(getDefaultIntervalsConfig()).toEqual({ apiKey: '', athleteId: '' });
        expect(getDefaultStravaConfig()).toEqual({ athlete_id: null, athlete_name: null });
    });

    it('explicit sign-out flag is one-shot', () => {
        expect(consumeExplicitSignOut()).toBe(false);
        markExplicitSignOut();
        expect(sessionStorage.getItem(EXPLICIT_SIGN_OUT_SESSION_KEY)).toBe('1');
        expect(consumeExplicitSignOut()).toBe(true);
        expect(consumeExplicitSignOut()).toBe(false);
        expect(sessionStorage.getItem(EXPLICIT_SIGN_OUT_SESSION_KEY)).toBeNull();
    });
});
