/**
 * User-configured bike-computer profile names (Garmin/Wahoo defaults for activity titles).
 * Stored in userSettings.bikeComputerProfileTitles and synced to Firestore for nightly sync.
 */

/**
 * @param {unknown} raw - string[], comma-separated string, or null
 * @returns {string[]}
 */
export function normalizeBikeComputerProfileTitles(raw) {
    if (raw == null || raw === '') return [];

    const list = Array.isArray(raw)
        ? raw
        : String(raw).split(/[,;\n]+/);

    const seen = new Set();
    const out = [];

    for (const item of list) {
        const trimmed = String(item).trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
    }

    return out;
}

/**
 * @param {string | null | undefined} title
 * @param {string[]} profileTitles
 * @returns {boolean}
 */
export function titleMatchesConfiguredProfile(title, profileTitles) {
    const t = (title || '').trim().toLowerCase();
    if (!t) return false;
    return normalizeBikeComputerProfileTitles(profileTitles)
        .some((name) => name.toLowerCase() === t);
}

/**
 * @param {{ bikeComputerProfileTitles?: unknown } | null | undefined} userSettings
 * @returns {string[]}
 */
export function resolveDeviceProfileTitlesFromSettings(userSettings) {
    return normalizeBikeComputerProfileTitles(userSettings?.bikeComputerProfileTitles);
}

/**
 * Display string for settings input.
 * @param {string[]} titles
 * @returns {string}
 */
export function formatBikeComputerProfileTitlesForInput(titles) {
    return normalizeBikeComputerProfileTitles(titles).join(', ');
}

/**
 * Parse settings text field → array for state.
 * @param {string} input
 * @returns {string[]}
 */
export function parseBikeComputerProfileTitlesInput(input) {
    return normalizeBikeComputerProfileTitles(input);
}
