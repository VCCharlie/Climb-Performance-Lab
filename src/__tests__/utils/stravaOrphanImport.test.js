import { describe, it, expect } from 'vitest';
import {
    linkIntervalsActivitiesToStravaList,
    applyStravaFuzzyMatchesToIntervals,
} from '../../utils/stravaLinkIntervalsFetch.js';
import {
    collectExistingStravaIds,
    findStravaOrphanActivities,
    stravaMatchesIntervalsSportFilters,
} from '../../utils/stravaOrphanImport.js';

const DAY = '2026-05-01';
const RIDE_TYPES = ['Ride', 'VirtualRide'];

function runLinkAndOrphanPipeline(intervals, stravaList, existingActivities = []) {
    const reservedStravaIds = collectExistingStravaIds(existingActivities);
    const linked = linkIntervalsActivitiesToStravaList(intervals, stravaList, { reservedStravaIds });
    applyStravaFuzzyMatchesToIntervals(linked, stravaList, { reservedStravaIds });
    return findStravaOrphanActivities({
        stravaActivities: stravaList,
        linkedIntervalsActivities: linked,
        existingActivities,
        allowedSportTypes: RIDE_TYPES,
        startYmd: DAY,
        endYmd: DAY,
    });
}

describe('stravaOrphanImport', () => {
    it('stravaMatchesIntervalsSportFilters maps Ride to Strava bike types', () => {
        expect(stravaMatchesIntervalsSportFilters({ sport_type: 'GravelRide' }, ['Ride'])).toBe(true);
        expect(stravaMatchesIntervalsSportFilters({ sport_type: 'Run' }, ['Ride'])).toBe(false);
        expect(stravaMatchesIntervalsSportFilters({ sport_type: 'VirtualRide' }, ['VirtualRide'])).toBe(true);
    });

    it('imports 1 orphan when 2 Strava rides exist but only 1 Intervals row', () => {
        const intervals = [
            {
                id: 'i1',
                date: `${DAY}T10:00:00`,
                title: 'Morning ride',
                type: 'Ride',
                distance: 50,
                moving_time: '2:00:00',
            },
        ];
        const strava = [
            {
                id: 111,
                start_date_local: `${DAY}T10:02:00`,
                name: 'Matched ride',
                sport_type: 'Ride',
                distance: 50000,
                moving_time: 7200,
                average_speed: 6.9,
            },
            {
                id: 222,
                start_date_local: `${DAY}T16:00:00`,
                name: 'Second ride',
                sport_type: 'Ride',
                distance: 30000,
                moving_time: 3600,
                average_speed: 8.3,
            },
        ];

        const { orphans, linkedToIntervalsCount } = runLinkAndOrphanPipeline(intervals, strava);

        expect(linkedToIntervalsCount).toBe(1);
        expect(orphans).toHaveLength(1);
        expect(orphans[0].id).toBe('strava_222');
        expect(orphans[0].strava_id).toBe('222');
        expect(orphans[0].title).toBe('Second ride');
    });

    it('imports 0 orphans when 2 Strava and 2 Intervals both link', () => {
        const intervals = [
            { id: 'i1', date: `${DAY}T10:00:00`, type: 'Ride', distance: 50, moving_time: '2:00:00' },
            { id: 'i2', date: `${DAY}T16:00:00`, type: 'Ride', distance: 30, moving_time: '1:00:00' },
        ];
        const strava = [
            {
                id: 111,
                start_date_local: `${DAY}T10:02:00`,
                name: 'Ride A',
                sport_type: 'Ride',
                distance: 50000,
                moving_time: 7200,
                average_speed: 6.9,
            },
            {
                id: 222,
                start_date_local: `${DAY}T16:01:00`,
                name: 'Ride B',
                sport_type: 'Ride',
                distance: 30000,
                moving_time: 3600,
                average_speed: 8.3,
            },
        ];

        const { orphans, linkedToIntervalsCount } = runLinkAndOrphanPipeline(intervals, strava);

        expect(linkedToIntervalsCount).toBe(2);
        expect(orphans).toHaveLength(0);
    });

    it('skips orphan when strava_id already exists in the activity log', () => {
        const intervals = [
            { id: 'i1', date: `${DAY}T10:00:00`, type: 'Ride', distance: 50, moving_time: '2:00:00' },
        ];
        const strava = [
            {
                id: 111,
                start_date_local: `${DAY}T10:02:00`,
                name: 'Matched ride',
                sport_type: 'Ride',
                distance: 50000,
                moving_time: 7200,
                average_speed: 6.9,
            },
            {
                id: 222,
                start_date_local: `${DAY}T16:00:00`,
                name: 'Already imported',
                sport_type: 'Ride',
                distance: 30000,
                moving_time: 3600,
                average_speed: 8.3,
            },
        ];
        const existing = [{ id: 'strava_222', strava_id: '222', date: `${DAY}T16:00:00`, type: 'Ride' }];

        const { orphans, alreadyLinkedCount } = runLinkAndOrphanPipeline(intervals, strava, existing);

        expect(orphans).toHaveLength(0);
        expect(alreadyLinkedCount).toBe(1);
    });

    it('does not link Strava id reserved by an existing log row', () => {
        const intervals = [
            { id: 'i1', date: `${DAY}T10:00:00`, type: 'Ride', distance: 50, moving_time: '2:00:00' },
        ];
        const strava = [
            {
                id: 111,
                start_date_local: `${DAY}T10:02:00`,
                name: 'Taken elsewhere',
                sport_type: 'Ride',
                distance: 50000,
                moving_time: 7200,
                average_speed: 6.9,
            },
        ];
        const existing = [{ id: 'strava_111', strava_id: '111', date: `${DAY}T09:00:00`, type: 'Ride' }];

        const { orphans, alreadyLinkedCount, linkedToIntervalsCount } = runLinkAndOrphanPipeline(intervals, strava, existing);

        expect(linkedToIntervalsCount).toBe(0);
        expect(orphans).toHaveLength(0);
        expect(alreadyLinkedCount).toBe(1);
    });
});
