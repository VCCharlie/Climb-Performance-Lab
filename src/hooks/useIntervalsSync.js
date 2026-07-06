import { useState } from 'react';
import { normalizeIntervalsActivity } from '../utils/intervals';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { devLog } from '../utils/safeLog';
import {
    fetchIntervalsActivitiesViaCloud,
    hasLocalIntervalsCredentials,
} from '../services/intervalsCloudApi';

function filterNonEmptyActivities(activities) {
    return activities.filter((act) =>
        (act.distance && act.distance > 0) ||
        (act.moving_time && act.moving_time > 0) ||
        (act.avg_power && act.avg_power > 0),
    );
}

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [error, setError] = useState(null);

    const syncViaDirectApi = async (startDate, endDate, allowedTypes) => {
        devLog('Starting Intervals.icu sync via direct API...');
        setSyncProgress('Fetching activities from Intervals.icu...');

        const url = `https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?oldest=${startDate}&newest=${endDate}`;
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
        devLog(`Fetched ${rawActivities.length} activities from Intervals.icu (direct API)`);

        let transformed = rawActivities.map(normalizeIntervalsActivity);
        if (allowedTypes?.length > 0) {
            transformed = transformed.filter((act) => allowedTypes.includes(act.type));
        }
        return filterNonEmptyActivities(transformed);
    };

    const syncViaCloud = async (startDate, endDate, allowedTypes) => {
        devLog('Starting Intervals.icu sync via cloud function (server credentials)...');
        setSyncProgress('Fetching activities via secure cloud sync...');

        const transformed = await fetchIntervalsActivitiesViaCloud({
            startDate,
            endDate,
            sportTypes: allowedTypes || [],
        });
        devLog(`Fetched ${transformed.length} activities via cloud sync`);
        return filterNonEmptyActivities(transformed);
    };

    const syncIntervals = async (startDate, endDate, allowedTypes) => {
        setIsSyncing(true);
        setSyncProgress('Connecting to Intervals.icu...');
        setError(null);

        const useDirect = hasLocalIntervalsCredentials(intervalsConfig);

        try {
            devLog(`Requesting activities from ${startDate} to ${endDate}`);
            if (allowedTypes?.length > 0) {
                devLog(`Sport filters: ${allowedTypes.join(', ')}`);
            }

            const transformed = useDirect
                ? await syncViaDirectApi(startDate, endDate, allowedTypes)
                : await syncViaCloud(startDate, endDate, allowedTypes);

            return transformed;
        } catch (err) {
            console.error('Intervals Sync Error:', err);
            let errMsg = err.message;

            if (err.name === 'AbortError') {
                errMsg = 'Sync timed out. Please try a shorter date range.';
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
