/**
 * CTL week-over-week delta for fluid week calendar headers.
 */

import { addDaysToYmd } from '../dashboardVolumeTotals';
import { getFitnessAtDate } from '../formTabMetrics';
import { todayYmd } from './coachHelpers';

function round1(n) {
    return Math.round(n * 10) / 10;
}

/**
 * CTL change from end of previous calendar week to end of this week (or today if mid-week).
 * @param {object[]} activities
 * @param {string} mondayYmd
 * @param {string} [referenceYmd]
 * @returns {{ ctlEnd: number, ctlPrevWeekEnd: number, delta: number } | null}
 */
export function computeCtlWeekOverWeekDelta(activities, mondayYmd, referenceYmd = todayYmd()) {
    if (!activities?.length || !mondayYmd) return null;

    const sundayYmd = addDaysToYmd(mondayYmd, 6);
    if (!sundayYmd) return null;

    const prevSundayYmd = addDaysToYmd(mondayYmd, -1);
    if (!prevSundayYmd) return null;

    const ctlEndYmd = referenceYmd < sundayYmd ? referenceYmd : sundayYmd;
    const ctlEndRow = getFitnessAtDate(activities, ctlEndYmd);
    const ctlPrevRow = getFitnessAtDate(activities, prevSundayYmd);

    if (!ctlEndRow || !ctlPrevRow) return null;
    if (ctlEndRow.ctl == null || ctlPrevRow.ctl == null) return null;

    return {
        ctlEnd: ctlEndRow.ctl,
        ctlPrevWeekEnd: ctlPrevRow.ctl,
        delta: round1(ctlEndRow.ctl - ctlPrevRow.ctl),
    };
}
