import { describe, it, expect } from 'vitest';
import {
    linkIntervalsActivitiesToStravaList,
    applyStravaFuzzyMatchesToIntervals,
} from '../../utils/stravaLinkIntervalsFetch.js';
import { matchStravaToSite } from '../../utils/stravaMatch.js';
import {
    buildStravaSyncMatchSummary,
    formatStravaSyncMatchSummary,
} from '../../utils/stravaSyncMatchSummary.js';

/** Apr 13 Whoosh — known Intervals row from user report */
const intervalsWhoosh = {
    id: 'i122256635',
    date: '2025-04-13T09:10:00',
    type: 'VirtualRide',
    title: 'My whoosh',
    distance: 5.4,
    moving_time: '1:17:44',
};

/** Second ride same day — outdoor */
const intervalsOutdoor = {
    id: 'i122256900',
    date: '2025-04-13T14:30:00',
    type: 'Ride',
    title: 'Afternoon loop',
    distance: 37.4,
    moving_time: '1:17:00',
};

const stravaOutdoorApr13 = {
    id: 14163153066,
    start_date_local: '2025-04-13T14:32:00',
    sport_type: 'Ride',
    name: 'Ja, wat eigenlijk precies?',
    distance: 37400,
    moving_time: 4620,
};

const stravaWhooshApr13 = {
    id: 14163440910,
    start_date_local: '2025-04-13T09:12:00',
    sport_type: 'VirtualRide',
    name: 'My Whoosh indoor',
    distance: 5400,
    moving_time: 4664,
    trainer: true,
};

describe('Multi-activity same day — Apr 13 Strava pair', () => {
    it('1 Intervals + 2 Strava: only the best-matching Strava ride links (expected)', () => {
        const merged = [{ ...intervalsWhoosh }];
        const stravaList = [stravaOutdoorApr13, stravaWhooshApr13];

        linkIntervalsActivitiesToStravaList(merged, stravaList);
        applyStravaFuzzyMatchesToIntervals(merged, stravaList);

        expect(merged).toHaveLength(1);
        expect(merged[0].strava_id).toBe('14163440910');

        const summary = buildStravaSyncMatchSummary({
            siteActivities: merged,
            stravaList,
            startYmd: '2025-04-13',
            endYmd: '2025-04-13',
            intervalsImported: 1,
        });
        expect(summary.stravaRideCount).toBe(2);
        expect(summary.linkedCount).toBe(1);
        expect(summary.unmatchedCount).toBe(1);
        expect(summary.unmatchedStravaIds).toContain('14163153066');
        expect(formatStravaSyncMatchSummary(summary)).toMatch(/unmatched/i);
    });

    it('2 Intervals + 2 Strava: each row gets its own strava_id (no reuse)', () => {
        const merged = [{ ...intervalsWhoosh }, { ...intervalsOutdoor }];
        const stravaList = [stravaOutdoorApr13, stravaWhooshApr13];

        linkIntervalsActivitiesToStravaList(merged, stravaList);
        applyStravaFuzzyMatchesToIntervals(merged, stravaList);

        const byId = Object.fromEntries(merged.map((a) => [a.id, a.strava_id]));
        expect(byId.i122256635).toBe('14163440910');
        expect(byId.i122256900).toBe('14163153066');

        const used = new Set(Object.values(byId));
        expect(used.size).toBe(2);
    });

    it('matchStravaToSite pairs two same-day rows without reusing strava_id or site id', () => {
        const site = [{ ...intervalsWhoosh }, { ...intervalsOutdoor }];
        const stravaList = [stravaOutdoorApr13, stravaWhooshApr13];

        const { matched, unmatchedStrava } = matchStravaToSite(stravaList, site);

        expect(matched).toHaveLength(2);
        expect(unmatchedStrava).toHaveLength(0);

        const stravaIds = matched.map((m) => m.strava.id);
        expect(stravaIds).toContain(14163153066);
        expect(stravaIds).toContain(14163440910);

        const siteIds = matched.map((m) => m.site.id);
        expect(new Set(siteIds).size).toBe(2);
    });

    it('matchStravaToSite does not assign both Strava rides to one Intervals row', () => {
        const site = [{ ...intervalsWhoosh }];
        const { matched, unmatchedStrava } = matchStravaToSite(
            [stravaOutdoorApr13, stravaWhooshApr13],
            site,
        );

        expect(matched).toHaveLength(1);
        expect(matched[0].strava.id).toBe(14163440910);
        expect(unmatchedStrava).toHaveLength(1);
        expect(unmatchedStrava[0].id).toBe(14163153066);
    });
});
