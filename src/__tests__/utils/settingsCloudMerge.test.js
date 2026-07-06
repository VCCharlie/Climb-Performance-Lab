import { describe, it, expect } from 'vitest';
import {
    stravaConfigForCloud,
    mergeStravaConfigFromCloud,
    intervalsConfigForCloud,
    mergeIntervalsConfigFromCloud,
    userSettingsForCloud,
    mergeUserSettingsFromCloud,
} from '../../utils/settingsCloudMerge.js';

describe('stravaConfigForCloud', () => {
    it('strips secrets and tokens', () => {
        const out = stravaConfigForCloud({
            client_id: '1',
            client_secret: 'sec',
            access_token: 'at',
            refresh_token: 'rt',
            athlete_id: 42,
            athlete_name: 'Test Rider',
            expires_at: 999,
        });
        expect(out).toEqual({
            client_id: '1',
            athlete_id: 42,
            athlete_name: 'Test Rider',
            expires_at: 999,
        });
    });
});

describe('mergeStravaConfigFromCloud', () => {
    it('keeps local tokens when cloud omits them', () => {
        const local = {
            client_id: '1',
            client_secret: 'local-secret',
            access_token: 'local-at',
            refresh_token: 'local-rt',
        };
        const cloud = { client_id: '1', athlete_id: 99, athlete_name: 'Cloud Name' };
        expect(mergeStravaConfigFromCloud(cloud, local)).toEqual({
            client_id: '1',
            athlete_id: 99,
            athlete_name: 'Cloud Name',
            client_secret: 'local-secret',
            access_token: 'local-at',
            refresh_token: 'local-rt',
        });
    });

    it('does not overwrite local tokens with empty cloud strings', () => {
        const local = { access_token: 'keep-me', refresh_token: 'keep-rt' };
        const cloud = { access_token: '', refresh_token: '', client_secret: '' };
        expect(mergeStravaConfigFromCloud(cloud, local).access_token).toBe('keep-me');
        expect(mergeStravaConfigFromCloud(cloud, local).refresh_token).toBe('keep-rt');
    });

    it('uses cloud tokens only when local has none (legacy docs)', () => {
        const cloud = { access_token: 'cloud-at', refresh_token: 'cloud-rt', client_secret: 'cloud-sec' };
        expect(mergeStravaConfigFromCloud(cloud, {}).access_token).toBe('cloud-at');
    });
});

describe('intervalsConfigForCloud', () => {
    it('clears api key', () => {
        expect(intervalsConfigForCloud({ athleteId: 'i1', apiKey: 'secret' })).toEqual({
            athleteId: 'i1',
            apiKey: '',
        });
    });
});

describe('mergeIntervalsConfigFromCloud', () => {
    it('preserves local api key when cloud was stripped', () => {
        expect(
            mergeIntervalsConfigFromCloud({ athleteId: 'i1', apiKey: '' }, { apiKey: 'local-key' }),
        ).toEqual({ athleteId: 'i1', apiKey: 'local-key' });
    });
});

describe('userSettingsForCloud', () => {
    it('strips githubPat and openweatherApiKey', () => {
        const out = userSettingsForCloud({ ftp: 250, githubPat: 'ghp_x', openweatherApiKey: 'owm' });
        expect(out.githubPat).toBe('');
        expect(out.openweatherApiKey).toBe('');
        expect(out.ftp).toBe(250);
    });
});

describe('mergeUserSettingsFromCloud', () => {
    it('preserves local secrets when cloud was stripped', () => {
        const merged = mergeUserSettingsFromCloud(
            { ftp: 300, githubPat: '' },
            { ftp: 250, githubPat: 'ghp_local' },
        );
        expect(merged.ftp).toBe(300);
        expect(merged.githubPat).toBe('ghp_local');
    });
});
