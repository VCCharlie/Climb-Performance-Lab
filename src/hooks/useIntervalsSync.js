import { useState } from 'react';
import { CLOUD_SYNC_URL } from '../config';

const useIntervalsSync = (intervalsConfig) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    const syncActivities = async (startDate, endDate, sportFilters, currentActivities = []) => {
        setIsSyncing(true);
        setError(null);

        try {
            let selectedTypes = Object.keys(sportFilters).filter(k => sportFilters[k]);
            if (selectedTypes.includes('Ride') && !selectedTypes.includes('VirtualRide')) {
                selectedTypes.push('VirtualRide');
            }

            const payload = {
                start_date: startDate,
                end_date: endDate,
                sport_types: selectedTypes,
                athlete_id: intervalsConfig.athleteId,
                api_key: intervalsConfig.apiKey,
                debug: true
            };

            const response = await fetch(CLOUD_SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Server Error");

            if (!Array.isArray(data) || data.length === 0) {
                return { count: 0, newActivities: [] };
            }

            const newRides = data.filter(ride => !currentActivities.some(existing => existing.id === ride.id));

            return { count: newRides.length, newActivities: newRides };

        } catch (e) {
            console.error(e);
            setError(e.message);
            throw e;
        } finally {
            setIsSyncing(false);
        }
    };

    return { syncActivities, isSyncing, error };
};

export default useIntervalsSync;
