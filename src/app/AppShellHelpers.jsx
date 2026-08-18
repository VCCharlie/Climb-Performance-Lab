import React, { Suspense } from 'react';
import Dashboard from '../components/Dashboard';
import SignInGate from '../components/SignInGate';
import { LoadingPanel } from '../components/ui';
import { GetStartedChecklist } from '../components/shell';
import { useActivitiesState } from '../context/ActivitiesContext';
import { useActivitiesList } from '../hooks/useActivities';
import { useActivityLogNavigation } from '../context/ActivityLogNavigationContext';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';

const LazyBucketList = lazyWithRetry(() => import('../components/BucketList'), 'BucketList');

export function GetStartedStrip({ userSettings, intervalsConfig, onOpenSettings, onGoToActivities }) {
    const activities = useActivitiesList();
    return (
        <GetStartedChecklist
            userSettings={userSettings}
            intervalsConfig={intervalsConfig}
            activityCount={activities.length}
            onOpenSettings={onOpenSettings}
            onGoToActivities={onGoToActivities}
        />
    );
}

export function AppLoadingGate({ authReady, user, authBusy, authError, onSignIn, children }) {
    const { isLoading: activitiesLoading, activities } = useActivitiesState();
    const waitingForInitialActivities = Boolean(user) && activitiesLoading && activities.length === 0;
    if (!authReady || authBusy || waitingForInitialActivities) {
        return <LoadingPanel />;
    }
    if (!user) {
        return <SignInGate onSignIn={onSignIn} authBusy={authBusy} authError={authError} />;
    }
    return children;
}

export function DashboardWithNavigation(props) {
    const { openActivityInLog, openActivityLogDateRange } = useActivityLogNavigation();
    return (
        <Dashboard
            {...props}
            onOpenActivityInLog={openActivityInLog}
            onOpenActivityLogDateRange={openActivityLogDateRange}
        />
    );
}

export function BucketListWithNavigation(props) {
    const { openActivityInLog } = useActivityLogNavigation();
    return (
        <Suspense fallback={<LoadingPanel message="Loading tab…" />}>
            <LazyBucketList
                {...props}
                onOpenActivityInLog={openActivityInLog}
            />
        </Suspense>
    );
}
