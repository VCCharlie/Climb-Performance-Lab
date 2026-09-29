import {
    ACTIVITY_TABLE_COLUMNS,
    ACTIVITY_COLUMN_PRESETS,
    ACTIVITY_LOG_DEFAULT_VISIBLE_KEYS,
} from '../config.js';

export const ACTIVITY_COLUMN_STORAGE_KEY = 'cpl-activity-log-columns';

const ALL_TABLE_KEYS = ACTIVITY_TABLE_COLUMNS.map((c) => c.key);

function normalizeKeyList(keys) {
    if (!Array.isArray(keys)) return null;
    const valid = new Set(ALL_TABLE_KEYS);
    const normalized = keys.filter((k) => typeof k === 'string' && valid.has(k));
    return normalized.length > 0 ? normalized : null;
}

/** Resolve preset id to an ordered list of column keys. */
export function resolvePresetKeys(presetId) {
    if (presetId === 'full') return [...ALL_TABLE_KEYS];
    const preset = ACTIVITY_COLUMN_PRESETS[presetId];
    if (!preset) return null;
    const valid = new Set(ALL_TABLE_KEYS);
    const keys = preset.filter((k) => valid.has(k));
    return keys.length > 0 ? keys : null;
}

/** Default column keys when nothing is stored (Essential preset). */
export function getDefaultVisibleKeys() {
    return resolvePresetKeys('essential') ?? [...ACTIVITY_LOG_DEFAULT_VISIBLE_KEYS];
}

/** Parse localStorage JSON; returns key array or null to use defaults. */
export function parseStoredColumnKeys(raw) {
    if (raw == null || raw === '') return null;
    try {
        const parsed = JSON.parse(raw);
        return normalizeKeyList(parsed);
    } catch {
        return null;
    }
}

/** Detect which preset matches the current key set (order-independent). */
export function detectActivePreset(visibleKeys) {
    const current = new Set(visibleKeys);
    for (const presetId of ['essential', 'power', 'full']) {
        const presetKeys = resolvePresetKeys(presetId);
        if (!presetKeys || presetKeys.length !== current.size) continue;
        if (presetKeys.every((k) => current.has(k))) return presetId;
    }
    return 'custom';
}

/** Map visible keys to column definition objects (preserves ACTIVITY_TABLE_COLUMNS order). */
export function columnsForVisibleKeys(visibleKeys) {
    const keySet = new Set(visibleKeys);
    return ACTIVITY_TABLE_COLUMNS.filter((c) => keySet.has(c.key));
}

/** Toggle one key; always keeps at least one column visible. */
export function toggleColumnKey(visibleKeys, key) {
    const set = new Set(visibleKeys);
    if (set.has(key)) {
        if (set.size <= 1) return visibleKeys;
        set.delete(key);
    } else {
        set.add(key);
    }
    return ALL_TABLE_KEYS.filter((k) => set.has(k));
}
