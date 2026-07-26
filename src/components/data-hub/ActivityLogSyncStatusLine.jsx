import React, { useMemo } from 'react';
import { formatActivityLogSyncLabel } from '../../utils/activityLogSyncLabel';

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
        <p
            role="status"
            className="text-[11px] text-cdmuted leading-snug mb-3 px-1 border-b border-cdborder/50 pb-2"
        >
            {label}
        </p>
    );
};

export default ActivityLogSyncStatusLine;
