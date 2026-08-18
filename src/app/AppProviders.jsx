import React from 'react';
import { ToastProvider } from '../context/ToastContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { ActivitiesProvider } from '../context/ActivitiesContext';
import { ActivityLogNavigationProvider } from '../context/ActivityLogNavigationContext';
import { ProfileFtpProvider } from '../context/ProfileFtpContext';
import { IntervalsSyncProvider } from '../context/IntervalsSyncContext';

/**
 * Application context providers that wrap the signed-in shell.
 * Keeps App.jsx focused on routing, state, and tab composition.
 */
export function AppProviders({
    user,
    userSettings,
    intervalsConfig,
    stravaGetToken,
    onNavigateToActivities,
    children,
}) {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <ActivitiesProvider key={user?.uid ?? 'signed-out'} user={user}>
                    <ActivityLogNavigationProvider onNavigateToActivities={onNavigateToActivities}>
                        <ProfileFtpProvider userSettings={userSettings}>
                            <IntervalsSyncProvider
                                intervalsConfig={intervalsConfig}
                                stravaGetToken={stravaGetToken}
                                userSettings={userSettings}
                            >
                                {children}
                            </IntervalsSyncProvider>
                        </ProfileFtpProvider>
                    </ActivityLogNavigationProvider>
                </ActivitiesProvider>
            </ConfirmProvider>
        </ToastProvider>
    );
}
