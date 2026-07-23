/**
 * Filter app-generated climb hints from text used for PB / profiler matching.
 * The UI badge "Similar to [climb]" must not count as proof the climb was ridden.
 */

/**
 * @param {string | null | undefined} text
 * @returns {boolean}
 */
export function isAppGeneratedClimbHint(text) {
    if (!text || typeof text !== 'string') return false;
    const normalized = text
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return /^similar\s+to\s+/i.test(normalized);
}

/**
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function stripAppGeneratedClimbHint(text) {
    if (!text || typeof text !== 'string') return '';
    if (isAppGeneratedClimbHint(text)) return '';
    return text.trim();
}
