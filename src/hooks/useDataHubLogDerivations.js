import { useEffect, useMemo } from 'react';
import { MONTH_ORDER } from '../config';
import { normalizeDate } from '../utils/formatters';
import { useProfilerClimbMatches } from './useProfilerClimbMatches';

/**
 * Activity Log derived state: navigation filters, table rows, gear options, bulk-visible ids.
 */
export function useDataHubLogDerivations({
    activities,
    focusActivityId,
    onFocusActivityCleared,
    isolateActivityId,
    logDateRangeFilter,
    setInternalTab,
    isGroupedView,
    openGroupedPathForActivity,
    processedActivities,
    groupedActivities,
    sortConfig,
    isYearExpanded,
    isMonthExpanded,
    climbDatabaseForMatch,
    filterDistMin,
    filterDistMax,
    filterSpeedMin,
    filterSpeedMax,
    filterPowerMin,
    filterPowerMax,
    filterDurMinMin,
    filterDurMaxMin,
    filterElevMin,
    filterElevMax,
    filterKjMin,
    filterKjMax,
    clearMetricFilters,
}) {
    useEffect(() => {
        if (!focusActivityId) return;
        const act = activities?.find((a) => String(a.id) === String(focusActivityId));
        if (act && isGroupedView) openGroupedPathForActivity(act);
        setInternalTab('log');
        const delayMs = act && isGroupedView ? 380 : 200;
        const t = setTimeout(() => {
            const el = document.getElementById(`activity-row-${focusActivityId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-cdprimary', 'ring-inset', 'bg-cdborder/40');
                setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-cdprimary', 'ring-inset', 'bg-cdborder/40');
                    onFocusActivityCleared?.();
                }, 4500);
            } else {
                onFocusActivityCleared?.();
            }
        }, delayMs);
        return () => clearTimeout(t);
    }, [focusActivityId, onFocusActivityCleared, activities, isGroupedView, openGroupedPathForActivity, setInternalTab]);

    useEffect(() => {
        if (isolateActivityId || (logDateRangeFilter?.startYmd && logDateRangeFilter?.endYmd)) {
            setInternalTab('log');
        }
    }, [isolateActivityId, logDateRangeFilter?.startYmd, logDateRangeFilter?.endYmd, setInternalTab]);

    const isolatedActivity = useMemo(() => {
        if (!isolateActivityId || !activities?.length) return null;
        return activities.find((a) => String(a.id) === String(isolateActivityId)) ?? null;
    }, [isolateActivityId, activities]);

    const rangeFilteredActivities = useMemo(() => {
        const s = logDateRangeFilter?.startYmd;
        const e = logDateRangeFilter?.endYmd;
        if (!s || !e || !activities?.length) return null;
        const list = activities.filter((a) => {
            const d = normalizeDate(a?.date);
            return d >= s && d <= e;
        });
        return [...list].sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)));
    }, [activities, logDateRangeFilter]);

    const logTableActivities = isolateActivityId
        ? (isolatedActivity ? [isolatedActivity] : [])
        : rangeFilteredActivities != null
            ? rangeFilteredActivities
            : (isGroupedView ? groupedActivities : processedActivities);
    const logTableGrouped = isolateActivityId || rangeFilteredActivities != null ? false : isGroupedView;

    const metricRangeActive =
        [filterDistMin, filterDistMax, filterSpeedMin, filterSpeedMax, filterPowerMin, filterPowerMax,
            filterDurMinMin, filterDurMaxMin, filterElevMin, filterElevMax, filterKjMin, filterKjMax]
            .some((v) => v !== '' && v != null);

    const applyMetricPreset = (apply) => {
        clearMetricFilters();
        apply();
    };

    const profilerClimbByActivityId = useProfilerClimbMatches(
        processedActivities,
        climbDatabaseForMatch || [],
    );

    const visibleActivityIdsFlat = useMemo(() => {
        if (!processedActivities?.length) return [];
        if (isGroupedView && groupedActivities) {
            const ids = [];
            const years = Object.keys(groupedActivities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a);
            for (const y of years) {
                const months = Object.keys(groupedActivities[y]).sort((a, b) => {
                    const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a);
                    return sortConfig.direction === 'asc' ? -diff : diff;
                });
                for (const m of months) {
                    if (!isYearExpanded(y) || !isMonthExpanded(y, m)) continue;
                    for (const act of groupedActivities[y][m] || []) {
                        if (act?.id != null) ids.push(String(act.id));
                    }
                }
            }
            return ids;
        }
        return processedActivities.reduce((acc, a) => {
            if (a.id != null) acc.push(String(a.id));
            return acc;
        }, []);
    }, [processedActivities, groupedActivities, isGroupedView, sortConfig.direction, isYearExpanded, isMonthExpanded]);

    return {
        isolatedActivity,
        rangeFilteredActivities,
        logTableActivities,
        logTableGrouped,
        metricRangeActive,
        applyMetricPreset,
        profilerClimbByActivityId,
        visibleActivityIdsFlat,
    };
}
