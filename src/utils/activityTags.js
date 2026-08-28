/**
 * User-defined activity tags (free labels for filter/search).
 * Stored as string[] on the activity object; persisted via Firestore merge.
 */

/**
 * @param {unknown} input — comma-separated string, string[], or null
 * @returns {string[]}
 */
export function normalizeActivityTags(input) {
    if (input == null || input === '') return [];

    if (Array.isArray(input)) {
        const seen = new Set();
        const out = [];
        for (const raw of input) {
            const tag = String(raw || '').trim().toLowerCase();
            if (!tag || seen.has(tag)) continue;
            seen.add(tag);
            out.push(tag);
        }
        return out;
    }

    if (typeof input === 'string') {
        const seen = new Set();
        const out = [];
        for (const part of input.split(/[,;]+/)) {
            const tag = part.trim().toLowerCase();
            if (!tag || seen.has(tag)) continue;
            seen.add(tag);
            out.push(tag);
        }
        return out;
    }

    return [];
}

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function activityHasTags(activity) {
    return normalizeActivityTags(activity?.tags).length > 0;
}

/**
 * @param {object | null | undefined} activity
 * @returns {string[]}
 */
export function activityTagList(activity) {
    return normalizeActivityTags(activity?.tags);
}

/**
 * @param {string[] | null | undefined} tags
 * @returns {string}
 */
export function formatTagsForInput(tags) {
    return normalizeActivityTags(tags).join(', ');
}

/**
 * @param {object | null | undefined} activity
 * @param {string} queryLower — already lowercased
 * @returns {boolean}
 */
export function activityMatchesTagSearch(activity, queryLower) {
    if (!queryLower) return true;
    const tags = activityTagList(activity);
    return tags.some((tag) => tag.includes(queryLower));
}

/**
 * Preserve user tags when Intervals re-sync omits them.
 * When `tags` is explicitly present on incoming (including `[]`), honor that value
 * so manual edits can clear tags without merge protection restoring them.
 *
 * @param {object} incoming
 * @param {object} existing
 * @param {object} out
 */
export function protectActivityTagsOnMerge(incoming, existing, out) {
    if (!existing || !out) return;

    const incomingHasTags = incoming != null
        && Object.prototype.hasOwnProperty.call(incoming, 'tags');

    if (incomingHasTags) {
        out.tags = normalizeActivityTags(incoming.tags);
    } else {
        const existingTags = normalizeActivityTags(existing?.tags);
        if (existingTags.length > 0) {
            out.tags = existingTags;
        }
    }

    const incomingHasNotes = incoming != null
        && Object.prototype.hasOwnProperty.call(incoming, 'user_notes');

    if (incomingHasNotes) {
        out.user_notes = incoming.user_notes ?? '';
    } else {
        const existingNotes = String(existing?.user_notes || '').trim();
        if (existingNotes) {
            out.user_notes = existing.user_notes;
        }
    }
}
