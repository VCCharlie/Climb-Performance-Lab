import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    collection,
    doc,
    getDocsFromServer,
    onSnapshot,
    setDoc,
    waitForPendingWrites,
} from 'firebase/firestore';
import { db } from '../firebase';
import { devLog } from '../utils/safeLog';
import { notify } from '../utils/notify';
import {
    mergeActivitiesPreservingEnrichment,
    prepareProtectedActivityUpsertsFromCurrent,
} from '../utils/activityUpsert';

const ActivitiesStateContext = createContext(null);
const ActivitiesActionsContext = createContext(null);

function sortActivitiesNewestFirst(list) {
    return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function ActivitiesProvider({ user, children }) {
    const [activities, setActivities] = useState([]);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [isLoading, setIsLoading] = useState(() => Boolean(user));
    const activitiesRef = useRef([]);

    const setActivitiesState = useCallback((nextActivities) => {
        if (typeof nextActivities !== 'function') {
            activitiesRef.current = nextActivities;
            setActivities(nextActivities);
            return;
        }

        setActivities((prev) => {
            const resolvedActivities = nextActivities(prev);
            activitiesRef.current = resolvedActivities;
            return resolvedActivities;
        });
    }, []);

    useEffect(() => {
        activitiesRef.current = activities;
    }, [activities]);

    const lastActivityDate = useMemo(() => {
        if (!activities?.length) return null;
        return activities[0]?.date || null;
    }, [activities]);

    const importActivities = useCallback((incoming) => {
        setActivitiesState((prev) => mergeActivitiesPreservingEnrichment(prev, incoming));
    }, [setActivitiesState]);

    const deleteActivity = useCallback((id) => {
        setActivitiesState((prev) => prev.filter((a) => String(a.id) !== String(id)));
    }, [setActivitiesState]);

    const clearActivities = useCallback(() => {
        setActivitiesState([]);
    }, [setActivitiesState]);

    const restoreFromBackup = useCallback((backupActivities) => {
        if (backupActivities) {
            setActivitiesState(backupActivities);
        }
    }, [setActivitiesState]);

    const refreshFromServer = useCallback(async () => {
        if (!db) return;
        try {
            try {
                await waitForPendingWrites(db);
            } catch {
                /* offline or no pending writes */
            }
            const actCol = collection(db, 'activities');
            const snapshot = await getDocsFromServer(actCol);
            const loadedActs = snapshot.docs.map((d) => d.data());

            if (loadedActs.length > 0) {
                setActivitiesState(sortActivitiesNewestFirst(loadedActs));
                devLog(`[Refresh] Server-fetch of ${loadedActs.length} activities.`);
            } else {
                setActivitiesState([]);
            }
        } catch (e) {
            console.error('Fout tijdens handmatig vernieuwen:', e);
            notify('Could not refresh activities from the cloud.', { variant: 'error', durationMs: 8000 });
        }
    }, [setActivitiesState]);

    const syncFromIntervals = useCallback(async (newActs) => {
        if (!newActs || newActs.length === 0) return 0;

        const mergedActivities = prepareProtectedActivityUpsertsFromCurrent(
            () => activitiesRef.current,
            newActs,
        );

        if (db) {
            await Promise.all(
                mergedActivities
                    .filter((act) => act?.id != null)
                    .map((act) => setDoc(doc(db, 'activities', String(act.id)), act, { merge: true })),
            );
        }

        importActivities(mergedActivities);
        return mergedActivities.length;
    }, [importActivities]);

    const getActivitiesSnapshot = useCallback(() => activitiesRef.current, []);

    useEffect(() => {
        if (!db || !user) {
            return undefined;
        }

        const actCol = collection(db, 'activities');
        const unsubscribe = onSnapshot(actCol, (snapshot) => {
            const byNormId = new Map();
            snapshot.docs.forEach((d) => {
                const data = d.data();
                const act = { ...data, id: data.id ?? d.id };
                if (act.id == null) return;
                const k = String(act.id);
                const cur = byNormId.get(k);
                byNormId.set(k, cur ? { ...cur, ...act } : act);
            });
            const loadedActs = Array.from(byNormId.values());

            if (loadedActs.length > 0) {
                React.startTransition(() => {
                    setActivitiesState(sortActivitiesNewestFirst(loadedActs));
                });
            } else {
                React.startTransition(() => {
                    setActivitiesState([]);
                });
            }

            const hasPendingWrites = snapshot.metadata.hasPendingWrites;
            setSyncStatus(hasPendingWrites ? 'syncing' : 'synced');
            setIsLoading(false);
        }, (error) => {
            console.error('Real-time sync error:', error);
            notify('Activity sync failed. Check your connection and try again.', { variant: 'error', durationMs: 10000 });
            setSyncStatus('error');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, setActivitiesState]);

    const stateValue = useMemo(
        () => ({
            activities,
            syncStatus,
            isLoading,
            lastActivityDate,
            count: activities.length,
            isEmpty: activities.length === 0,
        }),
        [activities, syncStatus, isLoading, lastActivityDate],
    );

    const actionsValue = useMemo(
        () => ({
            importActivities,
            deleteActivity,
            clearActivities,
            refreshFromServer,
            syncFromIntervals,
            restoreFromBackup,
            getActivitiesSnapshot,
            setSyncStatus,
        }),
        [
            importActivities,
            deleteActivity,
            clearActivities,
            refreshFromServer,
            syncFromIntervals,
            restoreFromBackup,
            getActivitiesSnapshot,
        ],
    );

    return (
        <ActivitiesActionsContext.Provider value={actionsValue}>
            <ActivitiesStateContext.Provider value={stateValue}>
                {children}
            </ActivitiesStateContext.Provider>
        </ActivitiesActionsContext.Provider>
    );
}

export function useActivitiesState() {
    const ctx = useContext(ActivitiesStateContext);
    if (!ctx) {
        throw new Error('useActivitiesState requires ActivitiesProvider');
    }
    return ctx;
}

export function useActivitiesActions() {
    const ctx = useContext(ActivitiesActionsContext);
    if (!ctx) {
        throw new Error('useActivitiesActions requires ActivitiesProvider');
    }
    return ctx;
}
