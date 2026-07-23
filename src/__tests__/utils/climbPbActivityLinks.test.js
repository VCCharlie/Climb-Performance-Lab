import { describe, it, expect } from 'vitest';
import {
    resolvePbActivity,
    getClimbPbLinkInfo,
    stravaIdFromActivity,
} from '../../utils/climbPbActivityLinks';

const activities = [
    { id: '12345', title: 'Alpe ride', strava_id: '98765432' },
    { id: 'i53534754', title: 'Indoor', strava_id: '111' },
];

describe('resolvePbActivity', () => {
    it('finds activity by stored PB activityId', () => {
        const act = resolvePbActivity({ activityId: '12345' }, activities);
        expect(act?.title).toBe('Alpe ride');
    });

    it('returns null when PB has no activityId', () => {
        expect(resolvePbActivity({}, activities)).toBeNull();
    });
});

describe('stravaIdFromActivity', () => {
    it('normalizes strava_id to string', () => {
        expect(stravaIdFromActivity({ strava_id: 123 })).toBe('123');
    });

    it('returns null for empty values', () => {
        expect(stravaIdFromActivity({ strava_id: '' })).toBeNull();
        expect(stravaIdFromActivity({})).toBeNull();
    });
});

describe('getClimbPbLinkInfo', () => {
    it('returns log id and external links from matched activity', () => {
        const { activityId, externalLinks } = getClimbPbLinkInfo(
            { activityId: '12345' },
            activities,
        );
        expect(activityId).toBe('12345');
        expect(externalLinks.some((l) => l.label === 'Strava' && l.href.includes('98765432'))).toBe(true);
        expect(externalLinks.some((l) => l.label === 'Intervals.icu' && l.href.includes('12345'))).toBe(true);
    });

    it('falls back to stored stravaId when activity is missing from list', () => {
        const { activityId, externalLinks } = getClimbPbLinkInfo(
            { activityId: '99999', stravaId: '55555' },
            activities,
        );
        expect(activityId).toBe('99999');
        expect(externalLinks).toHaveLength(2);
        expect(externalLinks[0].href).toContain('intervals.icu/activities/99999');
        expect(externalLinks[1].href).toContain('strava.com/activities/55555');
    });

    it('includes intervals link for non-numeric activity ids when activity is in list', () => {
        const { externalLinks } = getClimbPbLinkInfo(
            { activityId: 'i53534754' },
            activities,
        );
        expect(externalLinks.some((l) => l.href.includes('i53534754'))).toBe(true);
    });
});
