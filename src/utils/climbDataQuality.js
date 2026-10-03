/**
 * Climb database quality, deduplication, and display helpers.
 */

import { parseClimbfinderSlug } from './climbfinderUrl.js';

/** @param {object | null | undefined} climb */
export function isClimbMetricsComplete(climb) {
    if (!climb?.id || !String(climb.name || '').trim()) return false;
    const lengthKm = Number(climb.lengthKm);
    const avgGrade = Number(climb.avgGrade);
    const elevation = Number(climb.elevation);
    return (
        Number.isFinite(lengthKm)
        && lengthKm > 0
        && Number.isFinite(avgGrade)
        && avgGrade > 0
        && Number.isFinite(elevation)
        && elevation > 0
    );
}

/**
 * Higher tier wins dedupe conflicts (curated > BIG/Zwift chunk > generic > CyclingUp > scrape).
 * @param {object} climb
 * @returns {number}
 */
export function getClimbRecordTier(climb) {
    const id = String(climb?.id || '');
    if (/^(fr_|alp_)/.test(id)) return 50;
    if (climb?.country === 'ZWIFT' || /^z[w]?_/.test(id)) return 45;
    if (/^big_/.test(id) || climb?.source === 'BIGCycling.eu') return 40;
    if (/^cu_/.test(id)) return 20;
    if (/^sc_/.test(id)) return 10;
    return 30;
}

/**
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function normalizeClimbName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/^l['’]/, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+$/, '')
        .replace(/-south\b/g, '-s')
        .replace(/-north\b/g, '-n')
        .replace(/-west\b/g, '-w')
        .replace(/-east\b/g, '-e');
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function normalizeCyclingUpPath(url) {
    const raw = String(url || '').trim();
    if (!raw.toLowerCase().includes('cyclingup.eu')) return null;
    try {
        const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        const file = u.pathname.split('/').pop()?.replace(/\.php$/i, '') || null;
        return file ? file.toLowerCase() : null;
    } catch {
        return null;
    }
}

/**
 * Dedupe keys for a climb (any matching key collapses duplicates).
 * @param {object} climb
 * @returns {string[]}
 */
export function getClimbDedupeKeys(climb) {
    const keys = [];
    const cfSlug = parseClimbfinderSlug(climb?.url) || parseClimbfinderSlug(climb?.cuUrl);
    if (cfSlug) keys.push(`cf:${cfSlug}`);

    const cuPath = normalizeCyclingUpPath(climb?.url) || normalizeCyclingUpPath(climb?.cuUrl);
    if (cuPath) keys.push(`cu:${cuPath}`);

    const norm = normalizeClimbName(climb?.name);
    const country = (climb?.country || '').trim().toUpperCase();
    const lengthKm = Number(climb?.lengthKm);
    if (norm && country && Number.isFinite(lengthKm) && lengthKm > 0) {
        keys.push(`nm:${country}|${norm}|${Math.round(lengthKm)}`);
    }

    return keys;
}

/**
 * @param {object} a
 * @param {object} b
 * @returns {object}
 */
export function pickPreferredClimbRecord(a, b) {
    const aComplete = isClimbMetricsComplete(a);
    const bComplete = isClimbMetricsComplete(b);
    if (aComplete !== bComplete) return aComplete ? a : b;

    const tierDiff = getClimbRecordTier(a) - getClimbRecordTier(b);
    if (tierDiff !== 0) return tierDiff > 0 ? a : b;

    const scoreDiff = (Number(a?.score) || 0) - (Number(b?.score) || 0);
    if (scoreDiff !== 0) return scoreDiff > 0 ? a : b;

    const idA = String(a?.id || '');
    const idB = String(b?.id || '');
    return idA.localeCompare(idB) <= 0 ? a : b;
}

/**
 * Remove duplicate records and annotate data quality.
 * @param {object[]} climbs
 * @returns {object[]}
 */
export function processClimbDatabaseRecords(climbs) {
    const input = Array.isArray(climbs) ? climbs.filter((c) => c?.id) : [];
    if (input.length === 0) return [];

    const sorted = [...input].sort((a, b) => {
        const tierDiff = getClimbRecordTier(b) - getClimbRecordTier(a);
        if (tierDiff !== 0) return tierDiff;
        const completeDiff = Number(isClimbMetricsComplete(b)) - Number(isClimbMetricsComplete(a));
        if (completeDiff !== 0) return completeDiff;
        return (Number(b?.score) || 0) - (Number(a?.score) || 0);
    });

    /** @type {object[]} */
    const kept = [];
    /** @type {Set<string>} */
    const seenIds = new Set();
    /** @type {Map<string, string>} */
    const keyOwner = new Map();

    /** @type {object[]} */
    const legacyIncomplete = [];

    for (const climb of sorted) {
        if (seenIds.has(climb.id)) continue;

        if (!isClimbMetricsComplete(climb)) {
            legacyIncomplete.push({
                ...climb,
                dataQuality: 'incomplete',
            });
            seenIds.add(climb.id);
            continue;
        }

        const keys = getClimbDedupeKeys(climb);
        if (keys.some((k) => keyOwner.has(k))) continue;

        kept.push({
            ...climb,
            dataQuality: 'complete',
        });
        seenIds.add(climb.id);
        for (const k of keys) keyOwner.set(k, climb.id);
    }

    return [...kept, ...legacyIncomplete];
}

export const HIDE_INCOMPLETE_CLIMBS_STORAGE_KEY = 'cpl_hide_incomplete_climbs_v1';

/**
 * @returns {boolean}
 */
export function readHideIncompleteClimbsPref() {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    try {
        const raw = window.localStorage.getItem(HIDE_INCOMPLETE_CLIMBS_STORAGE_KEY);
        if (raw === '0' || raw === 'false') return false;
        return true;
    } catch {
        return true;
    }
}

/**
 * @param {boolean} hide
 */
export function persistHideIncompleteClimbsPref(hide) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(HIDE_INCOMPLETE_CLIMBS_STORAGE_KEY, hide ? '1' : '0');
    } catch {
        /* quota */
    }
}

/**
 * @param {object} climb
 * @returns {boolean}
 */
export function shouldShowClimbInSelector(climb, hideIncomplete) {
    if (!climb?.id) return false;
    if (!hideIncomplete) return true;
    return climb.dataQuality !== 'incomplete' && isClimbMetricsComplete(climb);
}
