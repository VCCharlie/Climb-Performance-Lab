/**
 * Heuristic: match an activity title to a climb in CLIMB_DATABASE (for Profiler deep-link).
 * Uses an inverted index so typical cases avoid O(activities × climbs) work.
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
    const parts = str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .split(/\s+/);

    // ⚡ Bolt Optimization: Use single-pass for-of loop instead of chained .map().filter()
    // to minimize intermediate array allocations in a hot path. The explicit .trim() is
    // redundant because .split(/\s+/) already removes surrounding whitespace.
    const words = [];
    for (const w of parts) {
        if (w.length >= 4 && !STOP.has(w)) {
            words.push(w);
        }
    }
    return words;
}

/** Tokens for index lookup when normWords is empty (e.g. short or stopword-heavy titles). */
function fallbackTokens(str) {
    if (!str || typeof str !== 'string') return [];
    const t = stripDiacritics(str.toLowerCase());
    const m = t.match(/[a-z0-9]{4,}/g);

    // ⚡ Bolt Optimization: Build Set in a single pass to avoid intermediate array allocation from .filter()
    if (!m) return [];
    const tokens = new Set();
    for (const w of m) {
        if (!STOP.has(w)) {
            tokens.add(w);
        }
    }
    return [...tokens];
}

/**
 * @param {Array<{ id: string, name: string }>} climbs
 * @returns {{ climbByWord: Map<string, Set<object>>, climbs: object[] }}
 */
export function buildClimbMatchIndex(climbs) {
    const climbByWord = new Map();
    const list = climbs || [];
    for (const c of list) {
        const name = (c.name || '').trim();
        if (name.length < 4) continue;
        const words = new Set([...normWords(name), ...fallbackTokens(name)]);
        for (const w of words) {
            if (!climbByWord.has(w)) climbByWord.set(w, new Set());
            climbByWord.get(w).add(c);
        }
    }
    return { climbByWord, climbs: list };
}

/**
 * @param {string} activityTitle
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @returns {object | null}
 */
export function findBestClimbUsingIndex(activityTitle, index) {
    if (!activityTitle || !index?.climbs?.length) return null;

    const titleLower = stripDiacritics(activityTitle.toLowerCase());
    const titleWords = normWords(activityTitle);
    const lookupKeys = titleWords.length > 0 ? titleWords : fallbackTokens(activityTitle);

    const candidates = new Set();
    for (const w of lookupKeys) {
        const s = index.climbByWord.get(w);
        if (s) s.forEach((c) => candidates.add(c));
    }

    let toCheck;
    if (lookupKeys.length === 0) {
        toCheck = index.climbs;
    } else if (candidates.size === 0) {
        return null;
    } else {
        toCheck = [...candidates];
    }

    let best = null;
    let bestScore = 0;

    for (const c of toCheck) {
        const name = (c.name || '').trim();
        if (name.length < 4) continue;

        const nameLower = stripDiacritics(name.toLowerCase());
        if (nameLower.length >= 5 && titleLower.includes(nameLower)) {
            return c;
        }

        const climbWords = normWords(name);
        let score = 0;
        for (const cw of climbWords) {
            if (titleWords.includes(cw)) score += cw.length + 2;
            else if (titleLower.includes(cw)) score += cw.length;
        }
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }

    return bestScore >= 6 ? best : null;
}

/**
 * @param {string} activityTitle
 * @param {Array<{ id: string, name: string }>} climbs
 * @returns {object | null} climb object or null
 */
export function findBestClimbForActivityTitle(activityTitle, climbs) {
    return findBestClimbUsingIndex(activityTitle, buildClimbMatchIndex(climbs));
}

function stripHtml(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Text fields searched for climb name heuristics (title first, then Strava/Intervals description).
 * @param {object | null | undefined} activity
 * @returns {string}
 */
export function buildActivityClimbMatchText(activity) {
    if (!activity || typeof activity !== 'object') return '';
    const parts = [];
    const title = (activity.title || '').trim();
    if (title) parts.push(title);
    const description = stripHtml(activity.description || activity.notes || '');
    if (description && description !== title) parts.push(description);
    return parts.join(' · ');
}

/**
 * Best climb match with source hint (title vs description-only).
 * @param {object} activity
 * @param {{ climbByWord: Map<string, Set<object>>, climbs: object[] }} index
 * @returns {{ climb: object | null, source: 'title' | 'description' | null }}
 */
export function findBestClimbForActivity(activity, index) {
    if (!activity || !index?.climbs?.length) {
        return { climb: null, source: null };
    }

    const title = (activity.title || '').trim();
    const fromTitle = title ? findBestClimbUsingIndex(title, index) : null;
    if (fromTitle) {
        return { climb: fromTitle, source: 'title' };
    }

    const description = stripHtml(activity.description || activity.notes || '');
    if (!description || description === title) {
        return { climb: null, source: null };
    }

    const fromDescription = findBestClimbUsingIndex(description, index);
    if (fromDescription) {
        return { climb: fromDescription, source: 'description' };
    }

    const combined = buildActivityClimbMatchText(activity);
    const fromCombined = combined && combined !== title && combined !== description
        ? findBestClimbUsingIndex(combined, index)
        : null;

    return {
        climb: fromCombined,
        source: fromCombined ? 'description' : null,
    };
}
