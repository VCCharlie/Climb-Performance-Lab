/**
 * Optional encrypted Gemini API key sync via Firestore body field.
 */

import { encryptSecret, decryptSecret } from './encryptedSecrets';
import { userSettingsForCloud, mergeUserSettingsFromCloud } from './settingsCloudMerge';

/**
 * Prepare user settings body for Firestore (strips plaintext secrets, optional encrypted Gemini key).
 * @param {object} userSettings
 * @param {string} [userId]
 */
export async function userSettingsBodyForCloud(userSettings = {}, userId) {
    const base = userSettingsForCloud(userSettings);
    const syncEnabled = Boolean(userSettings.syncGeminiKeyToCloud);

    base.syncGeminiKeyToCloud = syncEnabled;

    if (syncEnabled && userId && String(userSettings.geminiApiKey || '').trim()) {
        base.geminiApiKeyEncrypted = await encryptSecret(userSettings.geminiApiKey, userId);
    } else {
        base.geminiApiKeyEncrypted = '';
    }

    return base;
}

/**
 * Merge cloud body into local settings; decrypt Gemini key when sync is enabled.
 * @param {object} cloud
 * @param {object} local
 * @param {string} [userId]
 */
export async function mergeUserSettingsBodyFromCloud(cloud = {}, local = {}, userId) {
    const merged = mergeUserSettingsFromCloud(cloud, local);
    const syncEnabled = Boolean(cloud.syncGeminiKeyToCloud ?? local.syncGeminiKeyToCloud);
    merged.syncGeminiKeyToCloud = syncEnabled;

    if (syncEnabled && userId && cloud.geminiApiKeyEncrypted) {
        try {
            const decrypted = await decryptSecret(cloud.geminiApiKeyEncrypted, userId);
            if (decrypted) {
                merged.geminiApiKey = decrypted;
            }
        } catch (err) {
            console.warn('[Settings] Could not decrypt Gemini API key from cloud:', err);
        }
    }

    return merged;
}
