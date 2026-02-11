import { useState } from 'react';
import { normalizeIntervalsActivity } from '../utils';

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [error, setError] = useState(null);

    // Helper: Fetch with Timeout
    const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
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
        setSyncProgress(null);
        setError(null);
        console.log("Starting Deep Sync (Robust Mode)...");

        try {
            // 1. Fetch Activity List (Summaries)
            const params = new URLSearchParams({
                oldest: startDate,
                newest: endDate
            });
            const listUrl = `https://intervals.icu/api/v1/athlete/${intervalsConfig.athleteId}/activities?${params}`;
            console.log("Fetching summaries from:", listUrl);

            const authHeader = 'Basic ' + btoa(`API_KEY:${intervalsConfig.apiKey}`);

            const listResponse = await fetchWithTimeout(listUrl, {
                headers: { 'Authorization': authHeader }
            });

            if (!listResponse.ok) throw new Error(`Failed to fetch activities list: ${listResponse.status}`);
            const summaryData = await listResponse.json();
            console.log(`Fetched ${summaryData.length} summaries.`);

            if (summaryData.length === 0) {
                setIsSyncing(false);
                return [];
            }

            // 2. Deep Sync - Fetch Details individually with concurrency
            const BATCH_SIZE = 5;
            let detailedActivities = [];
            const total = summaryData.length;

            for (let i = 0; i < total; i += BATCH_SIZE) {
                const batchSummaries = summaryData.slice(i, i + BATCH_SIZE);
                const progressMsg = `Fetching details: ${Math.min(i + BATCH_SIZE, total)} / ${total}`;
                setSyncProgress(progressMsg);
                console.log(progressMsg);

                const batchPromises = batchSummaries.map(async (summary) => {
                    const detailUrl = `https://intervals.icu/api/v1/activity/${summary.id}?intervals=true`;
                    try {
                        const res = await fetchWithTimeout(detailUrl, {
                            headers: { 'Authorization': authHeader }
                        }, 10000);

                        if (res.ok) return await res.json();
                        console.warn(`Failed to fetch detail for ${summary.id}: ${res.status}`);
                        return summary;
                    } catch (err) {
                        console.error(`Error fetching detail for ${summary.id}:`, err);
                        return summary;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                detailedActivities.push(...batchResults);

                // Rate limiter breathing room
                await new Promise(r => setTimeout(r, 500));
            }

            console.log(`Deep Sync complete. Processed ${detailedActivities.length} activities.`);

            // 3. Normalize
            const newRides = detailedActivities.map(normalizeIntervalsActivity);

            // 4. Filter
            if (allowedTypes && allowedTypes.length > 0) {
                return newRides.filter(r => allowedTypes.includes(r.type));
            }
            return newRides;

        } catch (err) {
            console.error('Intervals Sync Error:', err);
            let errMsg = err.message;
            if (err.name === 'AbortError') {
                errMsg = "Sync timed out. Please try a shorter date range.";
            }
            setError(errMsg);
            throw err;
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    };

    return { syncIntervals, isSyncing, syncProgress, error };
};

export default useIntervalsSync;
