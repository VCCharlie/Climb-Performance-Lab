import { describe, it, expect } from 'vitest';
import {
    matchStravaToSite,
    scoreStravaSiteMatch,
    stravaTitleSimilarity,
    isIndoorOrVirtualRide,
    siteCalendarDateKey,
} from '../../utils/stravaMatch';

describe('stravaMatch indoor / private-style rides', () => {
    it('isIndoorOrVirtualRide detects VirtualRide and trainer flag', () => {
        expect(isIndoorOrVirtualRide('VirtualRide', { sport_type: 'Ride' })).toBe(true);
        expect(isIndoorOrVirtualRide('Ride', { sport_type: 'Ride', trainer: true })).toBe(true);
        expect(isIndoorOrVirtualRide('Ride', { sport_type: 'Ride' })).toBe(false);
    });

    it('stravaTitleSimilarity matches whoosh titles', () => {
        expect(stravaTitleSimilarity('My whoosh', 'My Whoosh')).toBe(1);
        expect(stravaTitleSimilarity('My whoosh', 'My Whoosh - indoor')).toBeGreaterThan(0.8);
    });

    it('scoreStravaSiteMatch uses duration when distance differs on indoor rides', () => {
        const site = {
            id: 'site1',
            date: '2025-04-13',
            type: 'VirtualRide',
            title: 'My whoosh',
            distance: 5.4,
            moving_time: '1:17:44',
        };
        const strava = {
            id: 888,
            sport_type: 'VirtualRide',
            name: 'My Whoosh',
            distance: 0,
            moving_time: 4664,
            private: true,
        };
        const scored = scoreStravaSiteMatch(site, strava);
        expect(scored.confidence).toBe('high');
        expect(scored.indoor).toBe(true);
    });

    it('matchStravaToSite links MyWhoosh-style ride with mismatched distance', () => {
        const stravaList = [{
            id: 888,
            start_date_local: '2025-04-13T09:15:00',
            sport_type: 'VirtualRide',
            name: 'My Whoosh',
            distance: 45000,
            moving_time: 4664,
            private: true,
        }];
        const site = [{
            id: 'site1',
            date: '2025-04-13T09:10:00',
            type: 'VirtualRide',
            title: 'My whoosh',
            distance: 5.4,
            moving_time: '1:17:44',
        }];
        const { matched } = matchStravaToSite(stravaList, site);
        expect(matched).toHaveLength(1);
        expect(matched[0].confidence).not.toBe('low');
        expect(matched[0].site.id).toBe('site1');
    });

    it('siteCalendarDateKey reads calendar day from ISO datetime', () => {
        expect(siteCalendarDateKey({ date: '2025-04-13T09:10:00' })).toBe('2025-04-13');
        expect(siteCalendarDateKey({ date: '2025-04-13' })).toBe('2025-04-13');
    });

    it('does not link My whoosh on 13 Apr to Strava ride on 14 Apr (regression)', () => {
        const stravaList = [{
            id: 14177055045,
            start_date_local: '2025-04-14T09:15:00',
            sport_type: 'VirtualRide',
            name: 'My Whoosh',
            distance: 45000,
            moving_time: 4664,
            private: true,
        }];
        const site = [{
            id: 'site1',
            date: '2025-04-13T09:10:00',
            type: 'VirtualRide',
            title: 'My whoosh',
            distance: 5.4,
            moving_time: '1:17:44',
        }];
        const { matched, unmatchedStrava } = matchStravaToSite(stravaList, site);
        expect(matched).toHaveLength(0);
        expect(unmatchedStrava).toHaveLength(1);
        expect(unmatchedStrava[0].id).toBe(14177055045);
    });

    it('matchStravaToSite does not cross calendar days for TZ drift (manual link required)', () => {
        const stravaList = [{
            id: 777,
            start_date_local: '2025-04-12T23:45:00',
            sport_type: 'VirtualRide',
            name: 'Late session',
            distance: 0,
            moving_time: 3600,
        }];
        const site = [{
            id: 'site2',
            date: '2025-04-13',
            type: 'VirtualRide',
            title: 'Late session',
            distance: 5,
            moving_time: '1:00:00',
        }];
        const { matched } = matchStravaToSite(stravaList, site);
        expect(matched).toHaveLength(0);
    });
});
