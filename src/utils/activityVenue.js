/**
 * Outdoor vs virtual (Zwift/trainer) venue helpers for activity ↔ climb matching.
 */

const VIRTUAL_ACTIVITY_TYPES = new Set(['VirtualRide', 'VirtualRun']);

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function isVirtualActivity(activity) {
    if (!activity) return false;
    if (activity.trainer === true) return true;
    return VIRTUAL_ACTIVITY_TYPES.has(activity.type);
}

/**
 * @param {object | null | undefined} climb
 * @returns {boolean}
 */
export function isZwiftClimb(climb) {
    return climb?.country === 'ZWIFT';
}

/**
 * @param {object | null | undefined} activity
 * @returns {'outdoor' | 'virtual'}
 */
export function activityVenue(activity) {
    return isVirtualActivity(activity) ? 'virtual' : 'outdoor';
}

/**
 * @param {object | null | undefined} climb
 * @returns {'outdoor' | 'virtual'}
 */
export function climbVenue(climb) {
    return isZwiftClimb(climb) ? 'virtual' : 'outdoor';
}

/**
 * @param {object | null | undefined} climb
 * @param {'outdoor' | 'virtual'} venue
 * @returns {boolean}
 */
export function isClimbVenueCompatible(climb, venue) {
    if (!climb) return false;
    return climbVenue(climb) === venue;
}

/** @typedef {'all' | 'outdoor' | 'virtual'} PbVenueFilter */

/**
 * @param {object | null | undefined} pb
 * @param {object | null | undefined} climb
 * @param {PbVenueFilter} filter
 * @returns {'outdoor' | 'virtual' | null}
 */
export function resolvePbVenue(pb, climb) {
    if (pb?.venue === 'outdoor' || pb?.venue === 'virtual') return pb.venue;
    if (climb) return climbVenue(climb);
    return null;
}

/**
 * @param {object | null | undefined} pb
 * @param {object | null | undefined} climb
 * @param {PbVenueFilter} filter
 */
export function pbMatchesVenueFilter(pb, climb, filter) {
    if (!pb) return false;
    if (!filter || filter === 'all') return true;
    const venue = resolvePbVenue(pb, climb);
    return venue === filter;
}

/**
 * @param {object | null | undefined} activity
 * @param {PbVenueFilter} filter
 */
export function activityMatchesVenueFilter(activity, filter) {
    if (!filter || filter === 'all') return true;
    return activityVenue(activity) === filter;
}

/**
 * @param {'outdoor' | 'virtual'} venue
 */
export function formatPbVenueLabel(venue) {
    if (venue === 'virtual') return 'Zwift';
    return 'Outdoor';
}
