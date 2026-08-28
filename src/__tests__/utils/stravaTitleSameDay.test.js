import { describe, it, expect } from 'vitest';
import {
    linkIntervalsActivitiesToStravaList,
    applyStravaFuzzyMatchesToIntervals,
} from '../../utils/stravaLinkIntervalsFetch.js';
import { matchStravaToSite, siteCalendarDateKey } from '../../utils/stravaMatch.js';
import {
    shouldApplyStravaTitleOnMatch,
    isStoredStravaLinkDayMismatch,
    stravaStartDatePatch,
} from '../../utils/stravaTitleSameDay.js';
import { protectStravaLinkedTitleOnMerge } from '../../utils/activityFieldRetention.js';

const intervalsApr13 = {
    id: 'i122256635',
    date: '2025-04-13T09:10:00',
    type: 'VirtualRide',
    title: 'My whoosh',
    distance: 5.4,
    moving_time: '1:17:44',
};

const stravaApr13 = {
    id: 14163440910,
    start_date_local: '2025-04-13T09:12:00',
    sport_type: 'VirtualRide',
    name: 'My Whoosh indoor',
    distance: 5400,
    moving_time: 4664,
    trainer: true,
};

const stravaApr14 = {
    id: 14177055045,
    start_date_local: '2025-04-14T09:15:00',
    sport_type: 'Ride',
    name: 'Ja, wat eigenlijk precies?',
    distance: 37400,
    moving_time: 4637,
};

describe('Strava title same-day guard (Apr 13 Whoosh regression)', () => {
    it('siteCalendarDateKey reads Apr 13 from Intervals datetime', () => {
        expect(siteCalendarDateKey(intervalsApr13)).toBe('2025-04-13');
    });

    it('matchStravaToSite does not link Apr 13 site to Apr 14 Strava despite similar duration', () => {
        const stravaList = [stravaApr14, stravaApr13];
        const { matched } = matchStravaToSite(stravaList, [{ ...intervalsApr13 }]);
        expect(matched).toHaveLength(1);
        expect(matched[0].strava.id).toBe(14163440910);
        expect(matched[0].strava.name).toBe('My Whoosh indoor');
    });

    it('applyStravaFuzzyMatchesToIntervals keeps same-day Strava title, not Apr 14 title', () => {
        const merged = [{ ...intervalsApr13 }];
        applyStravaFuzzyMatchesToIntervals(merged, [stravaApr14, stravaApr13]);
        expect(merged[0].strava_id).toBe('14163440910');
        expect(merged[0].title).not.toBe('Ja, wat eigenlijk precies?');
        expect(merged[0].title).toBe('My whoosh');
        expect(merged[0].strava_start_date).toBe('2025-04-13T09:12:00');
    });

    it('linkIntervalsActivitiesToStravaList does not assign Apr 14 title on Apr 13 import', () => {
        const linked = linkIntervalsActivitiesToStravaList(
            [{ ...intervalsApr13 }],
            [stravaApr14, stravaApr13],
        );
        expect(linked[0].strava_id).toBe('14163440910');
        expect(linked[0].title).not.toBe('Ja, wat eigenlijk precies?');
    });

    it('shouldApplyStravaTitleOnMatch rejects cross-day title even when site title is generic', () => {
        expect(
            shouldApplyStravaTitleOnMatch(
                { date: '2025-04-13', title: 'SUPERIOR' },
                stravaApr14,
                { deviceProfileTitles: ['SUPERIOR'] },
            ),
        ).toBe(false);
    });

    it('shouldApplyStravaTitleOnMatch allows same-day Strava title when site title is generic', () => {
        expect(
            shouldApplyStravaTitleOnMatch(
                { date: '2025-04-13T09:10:00', title: 'SUPERIOR' },
                stravaApr13,
                { deviceProfileTitles: ['SUPERIOR'] },
            ),
        ).toBe(true);
    });

    it('matchStravaToSite skips alreadyLinked when strava_id points to a different calendar day', () => {
        const siteWithWrongLink = {
            ...intervalsApr13,
            strava_id: '14177055045',
            strava_start_date: '2025-04-14T09:15:00',
        };
        const { alreadyLinked, matched } = matchStravaToSite([stravaApr14], [siteWithWrongLink]);
        expect(alreadyLinked).toHaveLength(0);
        expect(matched).toHaveLength(0);
    });

    it('isStoredStravaLinkDayMismatch detects legacy wrong-day strava_id', () => {
        expect(isStoredStravaLinkDayMismatch({
            date: '2025-04-13T09:10:00',
            strava_id: '14177055045',
            strava_start_date: '2025-04-14T09:15:00',
        })).toBe(true);
    });

    it('protectStravaLinkedTitleOnMerge restores Intervals title when strava_start_date mismatches site day', () => {
        const existing = {
            strava_id: '14177055045',
            strava_start_date: '2025-04-14T09:15:00',
            date: '2025-04-13T09:10:00',
            title: 'Ja, wat eigenlijk precies?',
        };
        const incoming = { title: 'My whoosh' };
        const out = { ...incoming };
        protectStravaLinkedTitleOnMerge(incoming, existing, out);
        expect(out.title).toBe('My whoosh');
    });

    it('stravaStartDatePatch stores start_date_local for later mismatch checks', () => {
        expect(stravaStartDatePatch(stravaApr13)).toEqual({
            strava_start_date: '2025-04-13T09:12:00',
        });
    });
});

describe('Strava title same-day — enrich path with wrong legacy strava_id', () => {
    it('shouldApplyStravaTitleOnMatch blocks Apr 14 title on Apr 13 row with stale strava_id', () => {
        const siteWithWrongLink = {
            date: '2025-04-13T09:10:00',
            title: 'My whoosh',
            strava_id: '14177055045',
            type: 'VirtualRide',
        };
        expect(shouldApplyStravaTitleOnMatch(siteWithWrongLink, stravaApr14)).toBe(false);
    });
});
