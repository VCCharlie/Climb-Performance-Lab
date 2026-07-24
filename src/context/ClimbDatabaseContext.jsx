import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    getClimbDatabaseSync,
    getCoreClimbDatabase,
    loadFullClimbDatabase,
    isFullClimbDatabaseLoaded,
} from '../services/climbDatabase';

export const ClimbDatabaseContext = createContext({
    climbs: getCoreClimbDatabase(),
    isFullLoaded: false,
    isLoading: false,
    loadFull: async () => getCoreClimbDatabase(),
});

export function ClimbDatabaseProvider({ children, prefetchOnIdle = true }) {
    const [climbs, setClimbs] = useState(getCoreClimbDatabase);
    const [isFullLoaded, setIsFullLoaded] = useState(isFullClimbDatabaseLoaded);
    const [isLoading, setIsLoading] = useState(false);

    // Always await the shared loader promise — never return core climbs while a
    // prefetch is in flight (PB scan / matching must see the full outdoor DB).
    const loadFull = useCallback(async () => {
        if (isFullClimbDatabaseLoaded()) {
            const full = getClimbDatabaseSync();
            setClimbs(full);
            setIsFullLoaded(true);
            return full;
        }

        setIsLoading(true);
        try {
            const full = await loadFullClimbDatabase();
            setClimbs(full);
            setIsFullLoaded(true);
            return full;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!prefetchOnIdle || isFullLoaded) return undefined;

        const run = () => {
            loadFull().catch(() => { /* non-fatal; tab can retry */ });
        };

        if (typeof requestIdleCallback !== 'undefined') {
            const id = requestIdleCallback(run, { timeout: 8000 });
            return () => cancelIdleCallback(id);
        }

        const t = setTimeout(run, 4000);
        return () => clearTimeout(t);
    }, [prefetchOnIdle, isFullLoaded, loadFull]);

    const value = useMemo(
        () => ({ climbs, isFullLoaded, isLoading, loadFull }),
        [climbs, isFullLoaded, isLoading, loadFull],
    );

    return (
        <ClimbDatabaseContext.Provider value={value}>
            {children}
        </ClimbDatabaseContext.Provider>
    );
}
