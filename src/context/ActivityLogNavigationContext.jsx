import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ActivityLogNavigationContext = createContext(null);

/**
 * Cross-tab navigation state between Dashboard and Activity Log (focus, isolate, date range).
 */
export function ActivityLogNavigationProvider({ onNavigateToActivities, children }) {
    const [activityFocusId, setActivityFocusId] = useState(null);
    const [logIsolateActivityId, setLogIsolateActivityId] = useState(null);
    const [logDateRangeFilter, setLogDateRangeFilter] = useState(null);
    const [activityLogRangesExpanded, setActivityLogRangesExpanded] = useState(false);

    const clearActivityLogFilters = useCallback(() => {
        setLogIsolateActivityId(null);
        setLogDateRangeFilter(null);
        setActivityFocusId(null);
    }, []);

    const openActivityInLog = useCallback((id, opts) => {
        if (id == null) return;
        setActivityFocusId(String(id));
        setLogIsolateActivityId(opts?.isolate ? String(id) : null);
        setLogDateRangeFilter(null);
        onNavigateToActivities?.();
    }, [onNavigateToActivities]);

    const openActivityLogDateRange = useCallback((range) => {
        if (!range?.startYmd || !range?.endYmd) return;
        setLogDateRangeFilter({ startYmd: range.startYmd, endYmd: range.endYmd });
        setLogIsolateActivityId(null);
        setActivityFocusId(null);
        onNavigateToActivities?.();
    }, [onNavigateToActivities]);

    const value = useMemo(
        () => ({
            activityFocusId,
            logIsolateActivityId,
            logDateRangeFilter,
            activityLogRangesExpanded,
            setActivityLogRangesExpanded,
            clearActivityLogFilters,
            openActivityInLog,
            openActivityLogDateRange,
            onFocusActivityCleared: () => setActivityFocusId(null),
        }),
        [
            activityFocusId,
            logIsolateActivityId,
            logDateRangeFilter,
            activityLogRangesExpanded,
            clearActivityLogFilters,
            openActivityInLog,
            openActivityLogDateRange,
        ],
    );

    return (
        <ActivityLogNavigationContext.Provider value={value}>
            {children}
        </ActivityLogNavigationContext.Provider>
    );
}

export function useActivityLogNavigation() {
    const ctx = useContext(ActivityLogNavigationContext);
    if (!ctx) {
        throw new Error('useActivityLogNavigation requires ActivityLogNavigationProvider');
    }
    return ctx;
}
