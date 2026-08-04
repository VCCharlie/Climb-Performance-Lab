import { describe, it, expect } from 'vitest';
import {
    classifyActivityStimulus,
    stimulusMatches,
    matchSessionsToActivities,
    daysApartYmd,
    CROSS_DAY_MATCH_WINDOW_DAYS,
} from '../../utils/coach/coachSessionMatcher';

describe('coachSessionMatcher', () => {
    it('classifyActivityStimulus maps IF to buckets', () => {
        expect(classifyActivityStimulus({ norm_power: 100 }, 250)).toBe('recovery');
        expect(classifyActivityStimulus({ norm_power: 200 }, 250)).toBe('endurance');
        expect(classifyActivityStimulus({ norm_power: 230 }, 250)).toBe('sweetspot');
        expect(classifyActivityStimulus({ norm_power: 255 }, 250)).toBe('threshold');
        expect(classifyActivityStimulus({ norm_power: 280 }, 250)).toBe('vo2');
    });

    it('stimulusMatches allows harder ride to fulfill easier plan', () => {
        expect(stimulusMatches('sweetspot', 'threshold')).toBe(true);
        expect(stimulusMatches('sweetspot', 'endurance')).toBe(false);
        expect(stimulusMatches('threshold', 'vo2')).toBe(true);
    });

    it('daysApartYmd counts calendar days', () => {
        expect(daysApartYmd('2026-08-03', '2026-08-04')).toBe(1);
        expect(daysApartYmd('2026-08-03', '2026-08-06')).toBe(3);
    });

    it('matchSessionsToActivities links cross-day rides within the window', () => {
        const sessions = [
            {
                date: '2026-08-03',
                day: 'Monday',
                plannedStimulus: 'rest',
                originalStimulus: 'rest',
                sameDayComplete: false,
            },
            {
                date: '2026-08-04',
                day: 'Tuesday',
                plannedStimulus: 'sweetspot',
                originalStimulus: 'sweetspot',
                sameDayComplete: false,
            },
        ];
        const activities = [
            { id: 'ride-1', date: '2026-08-03', norm_power: 230 },
        ];
        const matches = matchSessionsToActivities(sessions, activities, 250);
        expect(matches.get('2026-08-04')).toEqual({
            activityId: 'ride-1',
            activityDate: '2026-08-03',
            matchedStimulus: 'sweetspot',
        });
    });

    it('does not match rides outside the ±3 day window', () => {
        const sessions = [
            {
                date: '2026-08-08',
                plannedStimulus: 'endurance',
                originalStimulus: 'endurance',
                sameDayComplete: false,
            },
        ];
        const activities = [
            { id: 'old', date: '2026-08-03', norm_power: 200 },
        ];
        const matches = matchSessionsToActivities(sessions, activities, 250);
        expect(matches.has('2026-08-08')).toBe(false);
        expect(daysApartYmd('2026-08-03', '2026-08-08')).toBeGreaterThan(CROSS_DAY_MATCH_WINDOW_DAYS);
    });

    it('does not match historical rides from years ago', () => {
        const sessions = [
            {
                date: '2026-08-04',
                plannedStimulus: 'endurance',
                originalStimulus: 'endurance',
                sameDayComplete: false,
            },
            {
                date: '2026-08-06',
                plannedStimulus: 'sweetspot',
                originalStimulus: 'sweetspot',
                sameDayComplete: false,
            },
        ];
        const activities = [
            { id: 'ancient-1', date: '2011-06-07', norm_power: 200 },
            { id: 'ancient-2', date: '2014-03-01', norm_power: 230 },
            { id: 'ancient-3', date: '2012-03-09', norm_power: 205 },
        ];
        const matches = matchSessionsToActivities(sessions, activities, 250);
        expect(matches.size).toBe(0);
    });

    it('does not double-match activities already used on same day', () => {
        const sessions = [
            {
                date: '2026-08-03',
                plannedStimulus: 'endurance',
                originalStimulus: 'endurance',
                sameDayComplete: true,
            },
            {
                date: '2026-08-04',
                plannedStimulus: 'sweetspot',
                originalStimulus: 'sweetspot',
                sameDayComplete: false,
            },
        ];
        const activities = [
            { id: 'ride-1', date: '2026-08-03', norm_power: 200 },
        ];
        const matches = matchSessionsToActivities(sessions, activities, 250);
        expect(matches.has('2026-08-04')).toBe(false);
    });
});
