import { useActivitiesActions, useActivitiesState } from '../context/ActivitiesContext';

/** Full activities state + actions (re-renders when activities change). */
export function useActivities() {
    return { ...useActivitiesState(), ...useActivitiesActions() };
}

/** Activities array only — for read-heavy tabs (Dashboard, Coach). */
export function useActivitiesList() {
    return useActivitiesState().activities;
}

/** Firestore sync metadata for Header / shell. */
export function useActivitiesSync() {
    const { syncStatus, isLoading, lastActivityDate } = useActivitiesState();
    const { refreshFromServer } = useActivitiesActions();
    return { syncStatus, isLoading, lastActivityDate, refreshFromServer };
}
