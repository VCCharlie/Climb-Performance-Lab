import { stravaHttpErrorMessage } from './stravaHttp.js';

const DEFAULT_MATCH_MS = 900000; // 15 minutes — same as SyncTab

/**
 * Fetch Strava athlete activities in [startYmd, endYmd] (local calendar days, inclusive of end day).
 * @param {string} token
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {Promise<object[]>}
 */
export async function fetchStravaActivitiesInRange(token, startYmd, endYmd) {
    const afterTs = Math.floor(new Date(startYmd).getTime() / 1000);
    const beforeTs = Math.floor(new Date(endYmd).getTime() / 1000) + 86400;
    const all = [];
    let page = 1;
    while (true) {
        const resp = await fetch(
            `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) {
            throw new Error(stravaHttpErrorMessage(resp, 'Strava'));
        }
        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) break;
        all.push(...data);
        if (data.length < 200) break;
        page += 1;
    }
    return all;
}

/**
 * Attach strava_id / gear_id / Strava title to Intervals activities when start times align.
 * @param {object[]} intervalsActivities — normalized site activities (date ISO-ish)
 * @param {object[]} stravaActivities — Strava API list items
 * @param {{ matchWindowMs?: number }} [opts]
 * @returns {object[]} new array with merged fields where a match was found
 */
export function linkIntervalsActivitiesToStravaList(intervalsActivities, stravaActivities, opts = {}) {
    const win = opts.matchWindowMs ?? DEFAULT_MATCH_MS;
    const list = stravaActivities || [];
    return (intervalsActivities || []).map((act) => {
        if (!act || act.strava_id) return act;
        const actTime = new Date(act.date).getTime();
        if (Number.isNaN(actTime)) return act;
        const matchedStrava = list.find((s) => {
            const sTime = new Date(s.start_date_local || s.start_date).getTime();
            if (Number.isNaN(sTime)) return false;
            return Math.abs(actTime - sTime) < win;
        });
        if (!matchedStrava) return act;
        const stravaTitle = (matchedStrava.name || '').trim();
        return {
            ...act,
            strava_id: String(matchedStrava.id),
            gear_id: matchedStrava.gear_id || act.gear_id || null,
            ...(stravaTitle && { title: stravaTitle }),
        };
    });
}
