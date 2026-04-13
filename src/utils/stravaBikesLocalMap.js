/**
 * Cached Strava gear names from localStorage (filled by app when fetching athlete / gear API).
 */

export function getStravaBikesMapFromStorage() {
    try {
        const raw = localStorage.getItem('stravaBikesMap');
        if (!raw) return {};
        const o = JSON.parse(raw);
        return o && typeof o === 'object' ? o : {};
    } catch {
        return {};
    }
}

/**
 * @param {string | null | undefined} gearId - Strava gear id (often "b12345")
 * @param {string | null | undefined} gearName - stored gear_name from activity
 * @returns {{ display: string, title: string }} display text and tooltip (id when resolved from cache)
 */
export function resolveStravaGearDisplay(gearId, gearName) {
    const gid = gearId != null ? String(gearId).trim() : '';
    const name = gearName != null ? String(gearName).trim() : '';
    const map = getStravaBikesMapFromStorage();
    const looksLikeRawId = (s) => /^b\d+$/i.test(s);
    const isPlaceholder = !name || name === gid || looksLikeRawId(name);
    if (gid && isPlaceholder && map[gid]) {
        return { display: String(map[gid]), title: `${map[gid]} (${gid})` };
    }
    if (name) return { display: name, title: gid ? `${name} (${gid})` : name };
    if (gid) return { display: gid, title: `Strava gear_id: ${gid}` };
    return { display: '-', title: '' };
}
