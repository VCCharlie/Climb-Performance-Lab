import { useState } from 'react';
import { CLOUD_SYNC_URL } from '../config';

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [error, setError] = useState(null);

    // Helper: Fetch with Timeout
    const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    const syncIntervals = async (startDate, endDate, allowedTypes) => {
        setIsSyncing(true);
        setSyncProgress("Connecting to Intervals.icu...");
        setError(null);
        console.log("Starting Intervals.icu Sync via Cloud Function...");

        try {
            // Validate credentials
            if (!intervalsConfig || !intervalsConfig.athleteId || !intervalsConfig.apiKey) {
                throw new Error("Missing Intervals.icu credentials. Please configure in Settings.");
            }

            // Build request payload for cloud function
            const requestBody = {
                athlete_id: intervalsConfig.athleteId,
                api_key: intervalsConfig.apiKey,
                start_date: startDate,
                end_date: endDate,
                sport_types: allowedTypes && allowedTypes.length > 0 ? allowedTypes : undefined
            };

            console.log(`Requesting activities from ${startDate} to ${endDate}`);
            if (allowedTypes && allowedTypes.length > 0) {
                console.log(`Sport filters: ${allowedTypes.join(', ')}`);
            }

            setSyncProgress("Fetching activities from Intervals.icu...");

            // Call cloud function
            const response = await fetchWithTimeout(CLOUD_SYNC_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            setSyncProgress("Processing activities...");
            const activities = await response.json();
            
            console.log(`✅ Successfully fetched ${activities.length} activities from cloud function`);

            if (activities.length === 0) {
                setSyncProgress(null);
                setIsSyncing(false);
                return [];
            }

            // Cloud function already transforms data, so we can return it directly
            return activities;

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
                errMsg = "Network error. Please check your internet connection and try again.";
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
