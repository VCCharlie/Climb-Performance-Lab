import { useState, useMemo, useCallback, useEffect } from 'react';
import { safeLocalStorageSet } from '../utils/safeStorage.js';
import {
    getDefaultVisibleKeys,
    parseStoredColumnKeys,
    resolvePresetKeys,
    detectActivePreset,
    columnsForVisibleKeys,
    toggleColumnKey,
    ACTIVITY_COLUMN_STORAGE_KEY,
} from '../utils/activityColumnVisibility';

function loadInitialKeys() {
    if (typeof localStorage === 'undefined') return getDefaultVisibleKeys();
    return parseStoredColumnKeys(localStorage.getItem(ACTIVITY_COLUMN_STORAGE_KEY)) ?? getDefaultVisibleKeys();
}

/**
 * Activity Log column visibility — persisted in localStorage.
 * @returns {{ visibleColumns, visibleKeys, activePreset, applyPreset, toggleColumn, isColumnVisible }}
 */
export default function useActivityColumnVisibility() {
    const [visibleKeys, setVisibleKeys] = useState(loadInitialKeys);

    useEffect(() => {
        safeLocalStorageSet(ACTIVITY_COLUMN_STORAGE_KEY, JSON.stringify(visibleKeys));
    }, [visibleKeys]);

    const visibleColumns = useMemo(() => columnsForVisibleKeys(visibleKeys), [visibleKeys]);

    const activePreset = useMemo(() => detectActivePreset(visibleKeys), [visibleKeys]);

    const applyPreset = useCallback((presetId) => {
        const keys = resolvePresetKeys(presetId);
        if (keys) setVisibleKeys(keys);
    }, []);

    const toggleColumn = useCallback((key) => {
        setVisibleKeys((prev) => toggleColumnKey(prev, key));
    }, []);

    const isColumnVisible = useCallback((key) => visibleKeys.includes(key), [visibleKeys]);

    return {
        visibleColumns,
        visibleKeys,
        activePreset,
        applyPreset,
        toggleColumn,
        isColumnVisible,
    };
}
