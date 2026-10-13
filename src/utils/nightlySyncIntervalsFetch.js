/**
 * Resilient Intervals.icu fetch for GitHub Actions nightly sync:
 * Cloud Run proxy (with retries) → direct Intervals.icu REST fallback.
 * Shared with scripts/nightlySync.js (Node); keep import.meta.env-safe.
 */

import { CLOUD_SYNC_URL } from '../config.js';
import {
    buildIntervalsActivitiesListUrl,
    normalizeIntervalsActivityFromAny,
    filterNonEmptyIntervalsActivities,
} from './intervals.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';

export const NIGHTLY_CLOUD_SYNC_URL = CLOUD_SYNC_URL;

const DEFAULT_CLOUD_TIMEOUT_MS = 120_000;
const DEFAULT_DIRECT_TIMEOUT_MS = 120_000;
const DEFAULT_CLOUD_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 2_000;

/**
 * @param {string} apiKey
 * @returns {string}
 */
export function buildIntervalsBasicAuthHeader(apiKey) {
    const token = Buffer.from(`API_KEY:${apiKey}`, 'utf8').toString('base64');
    return `Basic ${token}`;
}

/**
 * @param {number} status
 * @returns {boolean}
 */
export function isRetryableCloudHttpStatus(status) {
    return status === 500 || status === 502 || status === 503 || status === 504 || status === 429;
}

/**
 * @param {string} body
 * @param {number} [maxLen=240]
 * @returns {string}
 */
export function summarizeHttpErrorBody(body, maxLen = 240) {
    const raw = String(body || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    if (/^\s*<!DOCTYPE html/i.test(raw) || /^\s*<html/i.test(raw)) {
        return 'HTML error page (upstream unavailable)';
    }
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen)}…`;
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
export function parseCloudSyncActivitiesPayload(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.activities)) {
        return data.activities;
    }
    throw new Error('Unexpected cloud sync response (expected JSON array).');
}

/**
 * @param {object[]} rawOrCloudRows
 * @param {string[] | undefined} allowedSportTypes
 * @returns {object[]}
 */
export function transformIntervalsListForNightly(rawOrCloudRows, allowedSportTypes) {
    let transformed = (rawOrCloudRows || []).map(normalizeIntervalsActivityFromAny);
    if (allowedSportTypes?.length > 0) {
        transformed = transformed.filter((act) => allowedSportTypes.includes(act.type));
    }
    return filterNonEmptyIntervalsActivities(transformed);
}

/**
 * @param {number} attempt 1-based
 * @param {number} baseDelayMs
 * @returns {number}
 */
export function computeRetryDelayMs(attempt, baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS) {
    const exp = Math.max(0, attempt - 1);
    return baseDelayMs * (2 ** exp);
}

/**
 * @param {{
 *   cloudUrl?: string,
 *   athleteId: string,
 *   apiKey: string,
 *   startDate: string,
 *   endDate: string,
 *   sportTypes?: string[],
 *   automationSecret?: string,
 *   retryAttempts?: number,
 *   retryBaseDelayMs?: number,
 *   timeoutMs?: number,
 *   fetchFn?: typeof fetch,
 *   onLog?: (message: string) => void,
 * }} opts
 * @returns {Promise<{ activities: object[], attempts: number }>}
 */
export async function fetchIntervalsActivitiesViaCloudWithRetry(opts) {
    const {
        cloudUrl = NIGHTLY_CLOUD_SYNC_URL,
        athleteId,
        apiKey,
        startDate,
        endDate,
        sportTypes = [],
        automationSecret,
        retryAttempts = DEFAULT_CLOUD_RETRY_ATTEMPTS,
        retryBaseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
        timeoutMs = DEFAULT_CLOUD_TIMEOUT_MS,
        fetchFn = fetch,
        onLog,
    } = opts;

    const log = (message) => {
        if (onLog) onLog(message);
    };

    /** @type {Error | null} */
    let lastError = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
        try {
            log(`Cloud sync attempt ${attempt}/${retryAttempts}…`);

            const headers = { 'Content-Type': 'application/json' };
            if (automationSecret) {
                headers['X-Automation-Secret'] = automationSecret;
            }

            const response = await fetchWithTimeout(cloudUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    athlete_id: athleteId,
                    api_key: apiKey,
                    start_date: startDate,
                    end_date: endDate,
                    sport_types: sportTypes,
                }),
            }, timeoutMs, fetchFn);

            if (!response.ok) {
                const errText = await response.text();
                const snippet = summarizeHttpErrorBody(errText);
                const err = new Error(
                    snippet
                        ? `Cloud function returned ${response.status}: ${snippet}`
                        : `Cloud function returned ${response.status}`,
                );
                err.status = response.status;
                throw err;
            }

            const data = await response.json();
            const rows = parseCloudSyncActivitiesPayload(data);
            log(`Cloud sync OK (${rows.length} activit${rows.length === 1 ? 'y' : 'ies'}).`);
            return { activities: rows, attempts: attempt };
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            const status = /** @type {{ status?: number }} */ (lastError).status;
            const retryable = status == null || isRetryableCloudHttpStatus(status);

            if (!retryable || attempt >= retryAttempts) {
                throw lastError;
            }

            const delayMs = computeRetryDelayMs(attempt, retryBaseDelayMs);
            log(`Cloud sync failed (${lastError.message}). Retrying in ${Math.round(delayMs / 1000)}s…`);
            await new Promise((resolve) => { setTimeout(resolve, delayMs); });
        }
    }

    throw lastError || new Error('Cloud sync failed.');
}

/**
 * @param {{
 *   athleteId: string,
 *   apiKey: string,
 *   startDate: string,
 *   endDate: string,
 *   allowedSportTypes?: string[],
 *   timeoutMs?: number,
 *   fetchFn?: typeof fetch,
 *   onLog?: (message: string) => void,
 * }} opts
 * @returns {Promise<object[]>}
 */
export async function fetchIntervalsActivitiesDirect(opts) {
    const {
        athleteId,
        apiKey,
        startDate,
        endDate,
        allowedSportTypes,
        timeoutMs = DEFAULT_DIRECT_TIMEOUT_MS,
        fetchFn = fetch,
        onLog,
    } = opts;

    if (onLog) onLog('Direct Intervals.icu API fetch…');

    const url = buildIntervalsActivitiesListUrl(athleteId, startDate, endDate);
    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
            Authorization: buildIntervalsBasicAuthHeader(apiKey),
            Accept: 'application/json',
        },
    }, timeoutMs, fetchFn);

    if (!response.ok) {
        const errBody = await response.text();
        const snippet = summarizeHttpErrorBody(errBody);
        throw new Error(
            snippet
                ? `Direct Intervals API ${response.status}: ${snippet}`
                : `Direct Intervals API ${response.status}`,
        );
    }

    const rawActivities = await response.json();
    if (!Array.isArray(rawActivities)) {
        throw new Error('Unexpected Intervals.icu list response (expected JSON array).');
    }

    const transformed = transformIntervalsListForNightly(rawActivities, allowedSportTypes);
    if (onLog) {
        onLog(`Direct API OK (${rawActivities.length} fetched → ${transformed.length} after filters).`);
    }
    return transformed;
}

/**
 * @typedef {{
 *   route: 'cloud' | 'direct_fallback',
 *   cloudAttempts: number,
 *   cloudError?: string,
 *   warning?: string,
 * }} NightlyIntervalsFetchMeta
 */

/**
 * @param {{
 *   athleteId: string,
 *   apiKey: string,
 *   startDate: string,
 *   endDate: string,
 *   sportTypes?: string[],
 *   automationSecret?: string,
 *   cloudUrl?: string,
 *   cloudRetryAttempts?: number,
 *   onLog?: (message: string) => void,
 *   fetchFn?: typeof fetch,
 * }} opts
 * @returns {Promise<{ activities: object[], meta: NightlyIntervalsFetchMeta }>}
 */
export async function fetchNightlyIntervalsActivitiesResilient(opts) {
    const {
        athleteId,
        apiKey,
        startDate,
        endDate,
        sportTypes = [],
        automationSecret,
        cloudUrl,
        cloudRetryAttempts = DEFAULT_CLOUD_RETRY_ATTEMPTS,
        onLog,
        fetchFn = fetch,
    } = opts;

    const log = (message) => {
        if (onLog) onLog(message);
    };

    try {
        const { activities: cloudRows, attempts } = await fetchIntervalsActivitiesViaCloudWithRetry({
            cloudUrl,
            athleteId,
            apiKey,
            startDate,
            endDate,
            sportTypes,
            automationSecret,
            retryAttempts: cloudRetryAttempts,
            fetchFn,
            onLog: log,
        });

        const activities = transformIntervalsListForNightly(cloudRows, sportTypes);
        return {
            activities,
            meta: {
                route: 'cloud',
                cloudAttempts: attempts,
            },
        };
    } catch (cloudErr) {
        const cloudMessage = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
        log(`[FAILSAFE] Cloud sync unavailable: ${cloudMessage}`);
        log('[FAILSAFE] Falling back to direct Intervals.icu API (same credentials as nightly secrets)…');

        try {
            const activities = await fetchIntervalsActivitiesDirect({
                athleteId,
                apiKey,
                startDate,
                endDate,
                allowedSportTypes: sportTypes,
                fetchFn,
                onLog: log,
            });

            return {
                activities,
                meta: {
                    route: 'direct_fallback',
                    cloudAttempts: cloudRetryAttempts,
                    cloudError: cloudMessage,
                    warning: 'Nightly sync used direct Intervals.icu API because Cloud Run sync failed.',
                },
            };
        } catch (directErr) {
            const directMessage = directErr instanceof Error ? directErr.message : String(directErr);
            const combined = new Error(
                `Intervals fetch failed (cloud: ${cloudMessage}; direct: ${directMessage})`,
            );
            combined.cloudError = cloudMessage;
            combined.directError = directMessage;
            throw combined;
        }
    }
}
