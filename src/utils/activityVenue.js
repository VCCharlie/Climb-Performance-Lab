/**
 * Outdoor vs virtual (Zwift/trainer) venue helpers for activity ↔ climb matching.
 */

import { determineActivityType } from './activityTypes.js';

const VIRTUAL_ACTIVITY_TYPES = new Set(['VirtualRide', 'VirtualRun']);

/**
 * Resolve canonical sport type (aligns indoor filter + PB venue with title heuristics).
 * @param {object | null | undefined} activity
 * @returns {string}
 */
export function resolveActivityType(activity) {
    if (!activity) return 'Ride';
    return determineActivityType(activity.type, activity.title);
}

/**
 * @param {object | null | undefined} activity
 * @returns {boolean}
 */
export function isVirtualActivity(activity) {
    if (!activity) return false;
    if (activity.trainer === true) return true;
    return VIRTUAL_ACTIVITY_TYPES.has(resolveActivityType(activity));
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
 * @param {object | null | undefined} [activity]
 * @returns {'outdoor' | 'virtual' | null}
 */
export function resolvePbVenue(pb, climb, activity = null) {
    if (pb?.venue === 'outdoor' || pb?.venue === 'virtual') return pb.venue;
    if (activity) return activityVenue(activity);
    if (climb) return climbVenue(climb);
    return null;
}

/**
 * @param {object | null | undefined} pb
 * @param {object | null | undefined} climb
 * @param {PbVenueFilter} filter
 * @param {object | null | undefined} [activity]
 */
export function pbMatchesVenueFilter(pb, climb, filter, activity = null) {
    if (!pb) return false;
    if (!filter || filter === 'all') return true;
    const venue = resolvePbVenue(pb, climb, activity);
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
    if (venue === 'virtual') return 'Indoor';
    return 'Outdoor';
}
