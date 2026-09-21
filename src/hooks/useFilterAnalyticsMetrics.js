import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    detectFilterAnalyticsPreset,
    getDefaultFilterAnalyticsMetricKeys,
    metricKeysForPreset,
    readFilterAnalyticsMetricPrefs,
    writeFilterAnalyticsMetricPrefs,
    normalizeVisibleMetricKeys,
    FILTER_ANALYTICS_PRESET_LABELS,
} from '../utils/filterAnalyticsMetrics';
import {
    detectFilterAnalyticsContext,
    filterAnalyticsContextSignature,
    resolveEffectiveMetricKeys,
} from '../utils/filterAnalyticsContextMetrics';

/**
 * Persisted visible metric keys + context-aware suggestions for the filter analytics bar.
 * @param {Record<string, unknown> | null | undefined} filterState
 */
export function useFilterAnalyticsMetrics(filterState = null) {
    const [prefs, setPrefs] = useState(() => readFilterAnalyticsMetricPrefs());
    const [manualOverride, setManualOverride] = useState(false);
    const prevContextSignatureRef = useRef(filterAnalyticsContextSignature(filterState));

    const storedKeys = prefs.visibleKeys;
    const storedPreset = prefs.activePreset === 'custom'
        ? (detectFilterAnalyticsPreset(storedKeys) || 'custom')
        : (prefs.activePreset || detectFilterAnalyticsPreset(storedKeys) || 'custom');

    const contextProfile = useMemo(
        () => detectFilterAnalyticsContext(filterState),
        [filterState],
    );

    const contextSignature = useMemo(
        () => filterAnalyticsContextSignature(filterState),
        [filterState],
    );

    useEffect(() => {
        if (prevContextSignatureRef.current !== contextSignature) {
            prevContextSignatureRef.current = contextSignature;
            setManualOverride(false);
        }
    }, [contextSignature]);

    const effectiveKeys = useMemo(
        () => resolveEffectiveMetricKeys({
            storedKeys,
            activePreset: storedPreset,
            contextProfile,
            manualOverride,
        }),
        [storedKeys, storedPreset, contextProfile, manualOverride],
    );

    const applyPreset = useCallback((presetId) => {
        const keys = metricKeysForPreset(presetId);
        if (!keys) return;
        writeFilterAnalyticsMetricPrefs(keys, presetId);
        setPrefs({ visibleKeys: keys, activePreset: presetId });
        setManualOverride(true);
    }, []);

    const toggleMetric = useCallback((key) => {
        setPrefs((prev) => {
            const baseKeys = manualOverride
                ? normalizeVisibleMetricKeys(prev.visibleKeys)
                : effectiveKeys;
            const next = baseKeys.includes(key)
                ? baseKeys.filter((k) => k !== key)
                : [...baseKeys, key];
            const normalized = normalizeVisibleMetricKeys(next);
            const detected = detectFilterAnalyticsPreset(normalized);
            writeFilterAnalyticsMetricPrefs(normalized, detected || 'custom');
            return { visibleKeys: normalized, activePreset: detected || 'custom' };
        });
        setManualOverride(true);
    }, [effectiveKeys, manualOverride]);

    const resetMetrics = useCallback(() => {
        const keys = getDefaultFilterAnalyticsMetricKeys();
        writeFilterAnalyticsMetricPrefs(keys, 'essential');
        setPrefs({ visibleKeys: keys, activePreset: 'essential' });
        setManualOverride(true);
    }, []);

    const applyContextSuggestion = useCallback(() => {
        setManualOverride(false);
    }, []);

    const dismissContextSuggestion = useCallback(() => {
        setManualOverride(true);
    }, []);

    const presetLabel = useMemo(() => {
        if (!manualOverride && contextProfile && (storedPreset === 'essential' || storedPreset === 'custom')) {
            return contextProfile.label;
        }
        if (storedPreset === 'custom') return 'Custom';
        return FILTER_ANALYTICS_PRESET_LABELS[storedPreset] || storedPreset || 'Essential';
    }, [manualOverride, contextProfile, storedPreset]);

    const contextActive = Boolean(contextProfile);
    const usingContextSuggestion = contextActive && !manualOverride
        && effectiveKeys.join(',') !== normalizeVisibleMetricKeys(storedKeys).join(',');

    return {
        visibleKeys: effectiveKeys,
        storedKeys,
        activePreset: storedPreset,
        presetLabel,
        applyPreset,
        toggleMetric,
        resetMetrics,
        applyContextSuggestion,
        dismissContextSuggestion,
        isMetricVisible: (key) => effectiveKeys.includes(key),
        contextProfile,
        contextActive,
        usingContextSuggestion,
        manualOverride,
    };
}
