import { describe, it, expect } from 'vitest';
import {
    userSettingsBodyForCloud,
    mergeUserSettingsBodyFromCloud,
} from '../../utils/settingsSecretsCloud';

describe('settingsSecretsCloud', () => {
    const userId = 'uid-sync-test';

    it('encrypts gemini key when sync enabled', async () => {
        const body = await userSettingsBodyForCloud({
            ftp: 250,
            geminiApiKey: 'my-secret-key',
            syncGeminiKeyToCloud: true,
        }, userId);
        expect(body.geminiApiKey).toBe('');
        expect(body.syncGeminiKeyToCloud).toBe(true);
        expect(body.geminiApiKeyEncrypted).toBeTruthy();
        expect(body.geminiApiKeyEncrypted).not.toContain('my-secret-key');
    });

    it('does not encrypt when sync disabled', async () => {
        const body = await userSettingsBodyForCloud({
            geminiApiKey: 'my-secret-key',
            syncGeminiKeyToCloud: false,
        }, userId);
        expect(body.geminiApiKeyEncrypted).toBe('');
    });

    it('decrypts on merge when sync enabled', async () => {
        const body = await userSettingsBodyForCloud({
            geminiApiKey: 'cloud-synced-key',
            syncGeminiKeyToCloud: true,
        }, userId);
        const merged = await mergeUserSettingsBodyFromCloud(body, { geminiApiKey: '' }, userId);
        expect(merged.geminiApiKey).toBe('cloud-synced-key');
        expect(merged.syncGeminiKeyToCloud).toBe(true);
    });
});
