import { useState } from 'react';
import {
    normalizeIntervalsActivityFromAny,
    filterNonEmptyIntervalsActivities,
    buildIntervalsActivitiesListUrl,
} from '../utils/intervals';
import { analyzeIntervalsImportHealth } from '../utils/intervalsImportHealth';
import { runActivityEnrichmentPipeline } from '../utils/enrichment/runActivityEnrichmentPipeline';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { devLog } from '../utils/safeLog';
import {
    fetchIntervalsActivitiesViaCloud,
    hasLocalIntervalsCredentials,
} from '../services/intervalsCloudApi';

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [error, setError] = useState(null);

    const enrichSyncedActivities = async (transformed, enrichOptions = {}) => {
        const { activities: result } = await runActivityEnrichmentPipeline(transformed, {
            intervalsConfig,
            profileFtp: enrichOptions.profileFtp,
            stravaToken: enrichOptions.stravaToken || null,
            deferDriftEnrich: enrichOptions.deferDriftEnrich,
            decouplingMaxFetches: enrichOptions.decouplingMaxFetches ?? 8,
            decouplingDelayMs: enrichOptions.decouplingDelayMs ?? 150,
            onProgress: (message) => setSyncProgress(message),
        });
        return result;
    };

    const syncViaDirectApi = async (startDate, endDate, allowedTypes, enrichOptions = {}) => {
        devLog('Starting Intervals.icu sync via direct API...');
        setSyncProgress('Fetching activities from Intervals.icu...');

        const url = buildIntervalsActivitiesListUrl(
            intervalsConfig.athleteId,
            startDate,
            endDate,
        );
        const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);

        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${authString}`,
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        setSyncProgress('Processing activities...');
        const rawActivities = await response.json();
        const fetched = rawActivities.length;
        devLog(`Fetched ${fetched} activities from Intervals.icu (direct API)`);

        let transformed = rawActivities.map(normalizeIntervalsActivityFromAny);
        const afterNormalize = transformed.length;
        if (allowedTypes?.length > 0) {
            transformed = transformed.filter((act) => allowedTypes.includes(act.type));
        }
        const afterSportFilter = transformed.length;
        transformed = filterNonEmptyIntervalsActivities(transformed);
        const imported = transformed.length;

        transformed = await enrichSyncedActivities(transformed, enrichOptions);
        const health = analyzeIntervalsImportHealth(transformed);
        return {
            activities: transformed,
            stats: {
                fetched,
                afterNormalize,
                afterSportFilter,
                imported,
                skippedEmpty: afterSportFilter - imported,
                skippedSport: afterNormalize - afterSportFilter,
                health,
                syncRoute: 'direct',
            },
        };
    };

    const syncViaCloud = async (startDate, endDate, allowedTypes, enrichOptions = {}) => {
        devLog('Starting Intervals.icu sync via cloud function (server credentials)...');
        setSyncProgress('Fetching activities via secure cloud sync...');

        const cloudPayload = await fetchIntervalsActivitiesViaCloud({
            startDate,
            endDate,
            sportTypes: allowedTypes || [],
        });
        const fetched = cloudPayload.length;
        devLog(`Fetched ${fetched} activities via cloud sync`);

        setSyncProgress('Processing activities...');
        let transformed = cloudPayload.map(normalizeIntervalsActivityFromAny);
        const afterNormalize = transformed.length;
        if (allowedTypes?.length > 0) {
            transformed = transformed.filter((act) => allowedTypes.includes(act.type));
        }
        const afterSportFilter = transformed.length;
        transformed = filterNonEmptyIntervalsActivities(transformed);
        const imported = transformed.length;

        transformed = await enrichSyncedActivities(transformed, enrichOptions);
        const health = analyzeIntervalsImportHealth(transformed);
        return {
            activities: transformed,
            stats: {
                fetched,
                afterNormalize,
                afterSportFilter,
                imported,
                skippedEmpty: afterSportFilter - imported,
                skippedSport: afterNormalize - afterSportFilter,
                health,
                syncRoute: 'cloud',
            },
        };
    };

    const syncIntervals = async (startDate, endDate, allowedTypes, enrichOptions = {}) => {
        setIsSyncing(true);
        setSyncProgress('Connecting to Intervals.icu...');
        setError(null);

        const useDirect = hasLocalIntervalsCredentials(intervalsConfig);

        try {
            devLog(`Requesting activities from ${startDate} to ${endDate}`);
            if (allowedTypes?.length > 0) {
                devLog(`Sport filters: ${allowedTypes.join(', ')}`);
            }

            const { activities: transformed, stats } = useDirect
                ? await syncViaDirectApi(startDate, endDate, allowedTypes, enrichOptions)
                : await syncViaCloud(startDate, endDate, allowedTypes, enrichOptions);

            return { activities: transformed, stats };
        } catch (err) {
            console.error('Intervals Sync Error:', err);
            let errMsg = err.message;

            if (err.name === 'AbortError') {
                errMsg = 'Sync timed out. Please try a shorter date range.';
            } else if (!useDirect && (errMsg.includes('401') || errMsg.includes('Unauthorized'))) {
                errMsg = 'Cloud sync requires Google sign-in. Sign in via the header, or add your Intervals.icu API key in Settings.';
            } else if (!useDirect && errMsg.includes('Missing credentials')) {
                errMsg = 'Cloud sync is not configured. Add your Intervals.icu API key in Settings, or check GitHub/GCP secrets for the cloud function.';
            } else if (errMsg.includes('401') || errMsg.includes('Invalid API credentials')) {
                errMsg = 'Invalid Intervals.icu credentials. Please check your Athlete ID and API Key in Settings.';
            } else if (errMsg.includes('404') || errMsg.includes('Athlete not found')) {
                errMsg = 'Athlete not found. Please verify your Athlete ID in Settings.';
            } else if (errMsg.includes('Failed to fetch') || errMsg.includes('Network')) {
                errMsg = 'Network error or CORS issue. Please check your internet connection.';
            }

            setError(errMsg);
            throw new Error(errMsg);
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    };

    return { syncIntervals, isSyncing, syncProgress, error };
};

export default useIntervalsSync;
