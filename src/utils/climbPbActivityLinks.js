/**
 * Resolve PB source activity and build links (Activity log, Strava, Intervals.icu).
 */

import { activityExternalLinks } from './dashboardActivityPeaks';
import { stravaActivityUrl } from './strava';

/**
 * @param {object | null | undefined} pb
 * @param {object[]} activities
 * @returns {object | null}
 */
export function resolvePbActivity(pb, activities) {
    if (!pb?.activityId) return null;
    const target = String(pb.activityId);
    return (activities || []).find((act) => act?.id != null && String(act.id) === target) ?? null;
}

/**
 * @param {object | null | undefined} activity
 * @returns {string | null}
 */
export function stravaIdFromActivity(activity) {
    if (activity?.strava_id == null) return null;
    const id = String(activity.strava_id).trim();
    return id || null;
}

/**
 * @param {object | null | undefined} pb
 * @param {object[]} activities
 * @returns {{ activityId: string | null, externalLinks: { label: string, href: string }[] }}
 */
export function getClimbPbLinkInfo(pb, activities) {
    if (!pb?.activityId) {
        return { activityId: null, externalLinks: [] };
    }

    const activityId = String(pb.activityId);
    const activity = resolvePbActivity(pb, activities);

    if (activity) {
        const externalLinks = activityExternalLinks(activity);
        const hasIntervals = externalLinks.some((link) => link.label === 'Intervals.icu');
        if (!hasIntervals && activityId) {
            externalLinks.unshift({
                label: 'Intervals.icu',
                href: `https://intervals.icu/activities/${encodeURIComponent(activityId)}`,
            });
        }
        return { activityId, externalLinks };
    }

    const externalLinks = [];
    if (activityId) {
        externalLinks.push({
            label: 'Intervals.icu',
            href: `https://intervals.icu/activities/${encodeURIComponent(activityId)}`,
        });
    }

    const stravaHref = stravaActivityUrl(pb.stravaId);
    if (stravaHref) {
        externalLinks.push({ label: 'Strava', href: stravaHref });
    }

    return { activityId, externalLinks };
}
