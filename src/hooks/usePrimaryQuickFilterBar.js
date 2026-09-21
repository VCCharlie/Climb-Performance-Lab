import { useCallback, useEffect, useState } from 'react';
import {
    getDefaultPrimaryQuickFilterIds,
    readPrimaryQuickFilterIds,
    togglePrimaryQuickFilterId,
    writePrimaryQuickFilterIds,
} from '../utils/activityLogPrimaryQuickFilters';

/**
 * Persisted user selection for Activity Log primary quick-filter bar.
 */
export function usePrimaryQuickFilterBar() {
    const [selectedIds, setSelectedIds] = useState(() => readPrimaryQuickFilterIds());

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key && e.key !== 'cpl.activityLogPrimaryQuickFilters.v1') return;
            setSelectedIds(readPrimaryQuickFilterIds());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const persist = useCallback((next) => {
        const normalized = writePrimaryQuickFilterIds(next);
        setSelectedIds(normalized);
        return normalized;
    }, []);

    const setSelectedFilterIds = useCallback((updater) => {
        setSelectedIds((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return persist(next);
        });
    }, [persist]);

    const toggleFilterOnBar = useCallback((id, enabled) => {
        setSelectedIds((prev) => persist(togglePrimaryQuickFilterId(prev, id, enabled)));
    }, [persist]);

    const resetToDefaults = useCallback(() => {
        persist(getDefaultPrimaryQuickFilterIds());
    }, [persist]);

    return {
        selectedIds,
        setSelectedFilterIds,
        toggleFilterOnBar,
        resetToDefaults,
    };
}
