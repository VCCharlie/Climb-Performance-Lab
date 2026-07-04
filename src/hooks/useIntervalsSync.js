import { useState } from 'react';
import { normalizeIntervalsActivity } from '../utils/intervals';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { devLog } from '../utils/safeLog';

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [error, setError] = useState(null);

    const syncIntervals = async (startDate, endDate, allowedTypes) => {
        setIsSyncing(true);
        setSyncProgress("Connecting to Intervals.icu...");
        setError(null);
        devLog("Starting Intervals.icu Sync via Direct API...");

        try {
            // Validate credentials
            if (!intervalsConfig || !intervalsConfig.athleteId || !intervalsConfig.apiKey) {
                throw new Error("Missing Intervals.icu credentials. Please configure in Settings.");
            }

            devLog(`Requesting activities from ${startDate} to ${endDate}`);
            if (allowedTypes && allowedTypes.length > 0) {
                devLog(`Sport filters: ${allowedTypes.join(', ')}`);
            }

            setSyncProgress("Fetching activities from Intervals.icu...");

            const url = `https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?oldest=${startDate}&newest=${endDate}`;
            const authString = btoa(`API_KEY:${intervalsConfig.apiKey}`);

            const response = await fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            setSyncProgress("Processing activities...");
            const rawActivities = await response.json();

            devLog(`✅ Successfully fetched ${rawActivities.length} activities from Intervals.icu`);

            if (rawActivities.length === 0) {
                setSyncProgress(null);
                setIsSyncing(false);
                return [];
            }

            // Normalise activities locally instead of relying on Cloud Function
            let transformed = rawActivities.map(normalizeIntervalsActivity);

            // Filter by sport type if specified
            if (allowedTypes && allowedTypes.length > 0) {
                transformed = transformed.filter(act => allowedTypes.includes(act.type));
            }

            // Filter out empty activities
            transformed = transformed.filter(act =>
                (act.distance && act.distance > 0) ||
                (act.moving_time && act.moving_time > 0) ||
                (act.avg_power && act.avg_power > 0)
            );

            return transformed;

        } catch (err) {
            console.error('Intervals Sync Error:', err);
            let errMsg = err.message;

            if (err.name === 'AbortError') {
                errMsg = "Sync timed out. Please try a shorter date range.";
            } else if (errMsg.includes('401') || errMsg.includes('Invalid API credentials')) {
                errMsg = "Invalid Intervals.icu credentials. Please check your Athlete ID and API Key in Settings.";
            } else if (errMsg.includes('404') || errMsg.includes('Athlete not found')) {
                errMsg = "Athlete not found. Please verify your Athlete ID in Settings.";
            } else if (errMsg.includes('Failed to fetch') || errMsg.includes('Network')) {
                errMsg = "Network error or CORS issue. Please check your internet connection.";
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
