import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useActivities } from '../hooks/useActivities';
import { useDataHubIntervalsSync } from '../hooks/useDataHubIntervalsSync';

const IntervalsSyncContext = createContext(null);

const EMPTY_BULK_SET = new Set();

/**
 * Shared Intervals.icu sync state (single hook instance for Activity Log + Dashboard “sync today”).
 */
export function IntervalsSyncProvider({
    children,
    intervalsConfig,
    stravaGetToken,
    userSettings,
}) {
    const { activities, importActivities, getActivitiesSnapshot } = useActivities();

    const intervalsSync = useDataHubIntervalsSync({
        intervalsConfig,
        activities,
        onImport: importActivities,
        getActivitiesSnapshot,
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
        ...intervalsSync,
        syncTodayActivities,
        isTodaySyncBusy: intervalsSync.isFetchingNewIntervals || intervalsSync.isSyncing,
    }), [intervalsSync, syncTodayActivities]);

    return (
        <IntervalsSyncContext.Provider value={value}>
            {children}
        </IntervalsSyncContext.Provider>
    );
}

export function useIntervalsSync() {
    const ctx = useContext(IntervalsSyncContext);
    if (!ctx) {
        throw new Error('useIntervalsSync requires IntervalsSyncProvider');
    }
    return ctx;
}

/** Dashboard header sync — safe when provider missing. */
export function useTodayIntervalsSync() {
    const ctx = useContext(IntervalsSyncContext);
    if (!ctx) {
        return { syncTodayActivities: null, isTodaySyncBusy: false };
    }
    return {
        syncTodayActivities: ctx.syncTodayActivities,
        isTodaySyncBusy: ctx.isTodaySyncBusy,
    };
}
