import { useCallback, useMemo, useState } from 'react';
import {
    detectFilterAnalyticsPreset,
    getDefaultFilterAnalyticsMetricKeys,
    metricKeysForPreset,
    readFilterAnalyticsMetricPrefs,
    writeFilterAnalyticsMetricPrefs,
    normalizeVisibleMetricKeys,
} from '../utils/filterAnalyticsMetrics';

/**
 * Persisted visible metric keys for the filter analytics bar.
 */
export function useFilterAnalyticsMetrics() {
    const [prefs, setPrefs] = useState(() => readFilterAnalyticsMetricPrefs());

    const visibleKeys = prefs.visibleKeys;
    const activePreset = prefs.activePreset === 'custom'
        ? (detectFilterAnalyticsPreset(visibleKeys) || 'custom')
        : (prefs.activePreset || detectFilterAnalyticsPreset(visibleKeys) || 'custom');

    const applyPreset = useCallback((presetId) => {
        const keys = metricKeysForPreset(presetId);
        if (!keys) return;
        writeFilterAnalyticsMetricPrefs(keys, presetId);
        setPrefs({ visibleKeys: keys, activePreset: presetId });
    }, []);

    const toggleMetric = useCallback((key) => {
        setPrefs((prev) => {
            const current = normalizeVisibleMetricKeys(prev.visibleKeys);
            const next = current.includes(key)
                ? current.filter((k) => k !== key)
                : [...current, key];
            const normalized = normalizeVisibleMetricKeys(next);
            const detected = detectFilterAnalyticsPreset(normalized);
            writeFilterAnalyticsMetricPrefs(normalized, detected || 'custom');
            return { visibleKeys: normalized, activePreset: detected || 'custom' };
        });
    }, []);

    const resetMetrics = useCallback(() => {
        const keys = getDefaultFilterAnalyticsMetricKeys();
        writeFilterAnalyticsMetricPrefs(keys, 'essential');
        setPrefs({ visibleKeys: keys, activePreset: 'essential' });
    }, []);

    const presetLabel = useMemo(() => {
        if (activePreset === 'custom') return 'Custom';
        return activePreset || 'essential';
    }, [activePreset]);

    return {
        visibleKeys,
        activePreset,
        presetLabel,
        applyPreset,
        toggleMetric,
        resetMetrics,
        isMetricVisible: (key) => visibleKeys.includes(key),
    };
}
