/**
 * Local climb elevation profiles (GPX import MVP) — localStorage per climb id.
 */

export const CLIMB_PROFILE_STORAGE_KEY = 'cpl.climbProfiles.v1';
export const CLIMB_PROFILE_UPDATED_EVENT = 'cpl-climb-profile-updated';

/**
 * @typedef {'gpx' | 'reference'} ClimbProfileSource
 */

/**
 * @typedef {object} StoredClimbProfile
 * @property {number} version
 * @property {string} climbId
 * @property {ClimbProfileSource} source
 * @property {string} importedAt
 * @property {string} [referenceUrl]
 * @property {string} [climbfinderSlug]
 * @property {string} [fileName]
 * @property {{ distanceKm?: number, distance?: number, elevation: number, gradient: number, progress?: number }[]} points
 */

function readStore() {
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(CLIMB_PROFILE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeStore(map) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CLIMB_PROFILE_STORAGE_KEY, JSON.stringify(map));
}

/**
 * @param {string} climbId
 * @returns {StoredClimbProfile | null}
 */
export function getStoredClimbProfile(climbId) {
    const id = (climbId || '').trim();
    if (!id) return null;
    const record = readStore()[id];
    if (!record || !Array.isArray(record.points) || record.points.length < 2) return null;
    return record;
}

/**
 * @param {StoredClimbProfile} record
 */
export function saveStoredClimbProfile(record) {
    if (!record?.climbId || !Array.isArray(record.points) || record.points.length < 2) {
        throw new Error('Invalid climb profile record.');
    }
    const map = readStore();
    map[String(record.climbId)] = {
        version: 1,
        ...record,
        climbId: String(record.climbId),
        importedAt: record.importedAt || new Date().toISOString(),
    };
    writeStore(map);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CLIMB_PROFILE_UPDATED_EVENT, {
            detail: { climbId: String(record.climbId) },
        }));
    }
}

/**
 * @param {string} climbId
 * @returns {boolean}
 */
export function clearStoredClimbProfile(climbId) {
    const id = (climbId || '').trim();
    if (!id) return false;
    const map = readStore();
    if (!map[id]) return false;
    delete map[id];
    writeStore(map);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CLIMB_PROFILE_UPDATED_EVENT, {
            detail: { climbId: id },
        }));
    }
    return true;
}

/**
 * @param {StoredClimbProfile | null | undefined} record
 * @returns {string}
 */
export function formatClimbProfileSourceLabel(record) {
    if (!record) return '';
    if (record.source === 'gpx') {
        return record.fileName ? `GPX · ${record.fileName}` : 'GPX import';
    }
    if (record.referenceUrl?.includes('climbfinder.com')) return 'Climbfinder reference + GPX';
    if (record.referenceUrl) return 'External reference + GPX';
    return 'Imported profile';
}
