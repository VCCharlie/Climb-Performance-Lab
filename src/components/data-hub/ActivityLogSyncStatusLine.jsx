import React, { useMemo } from 'react';
import { formatActivityLogSyncLabel } from '../../utils/activityLogSyncLabel';
import DashboardTodaySyncButton from '../dashboard/DashboardTodaySyncButton';

/**
 * Always-visible sync summary for Activity Log (below transient banners).
 */
const ActivityLogSyncStatusLine = ({
    isSignedIn,
    firestoreSyncStatus,
    isLoadingActivities,
    activityCount,
    lastActivityDate,
    lastCloudSyncAt,
    lastIntervalsSyncAt,
    isIntervalsBusy,
    onSyncToday,
    isTodaySyncBusy = false,
}) => {
    const label = useMemo(
        () => formatActivityLogSyncLabel({
            isSignedIn,
            firestoreSyncStatus,
            isLoadingActivities,
            activityCount,
            lastActivityDate,
            lastCloudSyncAt,
            lastIntervalsSyncAt,
            isIntervalsBusy,
        }),
        [
            isSignedIn,
            firestoreSyncStatus,
            isLoadingActivities,
            activityCount,
            lastActivityDate,
            lastCloudSyncAt,
            lastIntervalsSyncAt,
            isIntervalsBusy,
        ],
    );

    return (
        <div className="flex items-start justify-between gap-2 mb-3 px-1 border-b border-cdborder/50 pb-2">
            <p role="status" className="text-[11px] text-cdmuted leading-snug min-w-0 flex-1">
                {label}
            </p>
            {onSyncToday ? (
                <DashboardTodaySyncButton
                    onSync={onSyncToday}
                    isBusy={isTodaySyncBusy || isIntervalsBusy}
                    size="sm"
                    className="shrink-0 hidden sm:flex lg:hidden"
                />
            ) : null}
        </div>
    );
};

export default ActivityLogSyncStatusLine;
