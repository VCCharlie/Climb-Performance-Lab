import { useMemo } from 'react';
import {
    buildActivityLogFilterLabels,
    buildActivityLogFilterStateFromBarProps,
    isActivityLogFilterActive,
} from '../utils/activityLogFilterActive';
import { computeActivityLogFilterAnalytics } from '../utils/activityLogFilterAnalytics';

/**
 * Memoized filter analytics for the Activity Log filter summary bar.
 */
export function useActivityLogFilterAnalytics({
    filterBarProps = {},
    singleDayFilterYmd = null,
    logDateRangeFilter = null,
    isolateActivityId = null,
    filteredActivities = [],
    allActivities = [],
    profileFtp = 0,
}) {
    const {
        search,
        indoorFilter,
        thisWeekOnly,
        rollingDays,
        withPowerOnly,
        noPowerOnly,
        highLoadOnly,
        hasTagOnly,
        stravaLinkedOnly,
        noStravaLinkOnly,
        possibleDuplicatesOnly,
        longRideOnly,
        missingHrOnly,
        minTss,
        filterGearId,
        filterElevMin,
        filterElevMax,
        activeSportTypes,
        metricRangeActive,
    } = filterBarProps;

    const sportTypesKey = (activeSportTypes || []).join(',');

    const filterState = useMemo(
        () => buildActivityLogFilterStateFromBarProps(filterBarProps, {
            singleDayFilterYmd,
            logDateRangeFilter,
            isolateActivityId,
        }),
        [
            search,
            indoorFilter,
            thisWeekOnly,
            rollingDays,
            withPowerOnly,
            noPowerOnly,
            highLoadOnly,
            hasTagOnly,
            stravaLinkedOnly,
            noStravaLinkOnly,
            possibleDuplicatesOnly,
            longRideOnly,
            missingHrOnly,
            minTss,
            filterGearId,
            sportTypesKey,
            metricRangeActive,
            filterElevMin,
            filterElevMax,
            singleDayFilterYmd,
            logDateRangeFilter?.startYmd,
            logDateRangeFilter?.endYmd,
            isolateActivityId,
        ],
    );

    const filterLabels = useMemo(
        () => buildActivityLogFilterLabels(filterState),
        [filterState],
    );

    const isActive = useMemo(
        () => isActivityLogFilterActive(filterState, filteredActivities, allActivities),
        [filterState, filteredActivities, allActivities],
    );

    const analytics = useMemo(() => {
        if (!isActive || !allActivities?.length) return null;
        return computeActivityLogFilterAnalytics(
            filteredActivities,
            allActivities,
            profileFtp,
        );
    }, [isActive, filteredActivities, allActivities, profileFtp]);

    return {
        isActive,
        filterLabels,
        filterState,
        analytics,
    };
}
