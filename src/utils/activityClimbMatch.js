/**
 * Heuristic: match an activity title to a climb in CLIMB_DATABASE (for Profiler deep-link).
 */

const STOP = new Set([
    'ride', 'rit', 'fiets', 'bike', 'cycling', 'virtual', 'zwift', 'training',
    'morning', 'afternoon', 'evening', 'ochtend', 'middag', 'avond', 'weekend',
    'indoor', 'buiten', 'easy', 'rust', 'recovery', 'duur', 'endurance',
]);

function stripDiacritics(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normWords(str) {
    if (!str || typeof str !== 'string') return [];
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !STOP.has(w));
}

/**
 * @param {string} activityTitle
 * @param {Array<{ id: string, name: string }>} climbs
 * @returns {object | null} climb object or null
 */
export function findBestClimbForActivityTitle(activityTitle, climbs) {
    if (!activityTitle || !climbs?.length) return null;

    const titleLower = stripDiacritics(activityTitle.toLowerCase());
    const titleWords = normWords(activityTitle);

    let best = null;
    let bestScore = 0;

    for (const c of climbs) {
        const name = (c.name || '').trim();
        if (name.length < 4) continue;

        const nameLower = stripDiacritics(name.toLowerCase());
        if (nameLower.length >= 5 && titleLower.includes(nameLower)) {
            return c;
        }

        const climbWords = normWords(name);
        let score = 0;
        for (const w of climbWords) {
            if (titleWords.includes(w)) score += w.length + 2;
            else if (titleLower.includes(w)) score += w.length;
        }
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }

    return bestScore >= 6 ? best : null;
}
