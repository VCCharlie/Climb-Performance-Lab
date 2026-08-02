import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useActivities } from '../hooks/useActivities';
import { useDataHubIntervalsSync } from '../hooks/useDataHubIntervalsSync';

const TodayIntervalsSyncContext = createContext(null);

const EMPTY_BULK_SET = new Set();

/**
 * Fetch & merge Intervals.icu activities for a date range (shared with Activity Log).
 */
export function TodayIntervalsSyncProvider({
    children,
    intervalsConfig,
    stravaGetToken,
    userSettings,
}) {
    const { activities, importActivities } = useActivities();
    const intervalsSync = useDataHubIntervalsSync({
        intervalsConfig,
        activities,
        onImport: importActivities,
        stravaGetToken,
        bulkSelectedIds: EMPTY_BULK_SET,
        selectedActivitiesForBulk: [],
        userSettings,
    });

    const syncTodayActivities = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        return intervalsSync.fetchAndMergeIntervalsRange(today, today);
    }, [intervalsSync.fetchAndMergeIntervalsRange]);

    const value = useMemo(() => ({
        syncTodayActivities,
        isTodaySyncBusy: intervalsSync.isFetchingNewIntervals || intervalsSync.isSyncing,
    }), [
        syncTodayActivities,
        intervalsSync.isFetchingNewIntervals,
        intervalsSync.isSyncing,
    ]);

    return (
        <TodayIntervalsSyncContext.Provider value={value}>
            {children}
        </TodayIntervalsSyncContext.Provider>
    );
}

export function useTodayIntervalsSync() {
    const ctx = useContext(TodayIntervalsSyncContext);
    if (!ctx) {
        return { syncTodayActivities: null, isTodaySyncBusy: false };
    }
    return ctx;
}
