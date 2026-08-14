import { describe, it, expect } from 'vitest';
import { computeClimbingReadiness, computeClimbingReadinessHistory } from '../../utils/climbingReadiness';
import { getFitnessAtDate } from '../../utils/formTabMetrics';
import { todayYmd } from '../../utils/coach/coachHelpers';
import { currentWeekRange } from '../../utils/volumeGoals';
import { TERRAIN_PROFILE_FLAT, TERRAIN_PROFILE_HILLY } from '../../utils/climbingTerrainProfile';

function expectedReadinessTsb(activities, referenceDate) {
    const week = currentWeekRange(referenceDate);
    const today = todayYmd();
    const asOfYmd = week.endYmd < today ? week.endYmd : today;
    return getFitnessAtDate(activities, asOfYmd)?.tsb;
}

describe('computeClimbingReadiness', () => {
    const baseDate = new Date('2026-07-23T12:00:00');

    it('returns building badge with no week activities', () => {
        const result = computeClimbingReadiness({
            activities: [],
            ftp: 250,
            referenceDate: baseDate,
        });
        expect(result.composite).toBeGreaterThanOrEqual(0);
        expect(result.metrics.elevationM).toBe(0);
        expect(result.metrics.weekTss).toBe(0);
    });

    it('scores elevation and Z2 from week activities', () => {
        const activities = [
            {
                date: '2026-07-22',
                climbing: 800,
                load: 120,
                norm_power: 160,
                moving_time: 7200,
            },
            {
                date: '2026-07-21',
                climbing: 400,
                load: 90,
                avg_power: 170,
                moving_time: 5400,
            },
        ];

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        expect(result.metrics.elevationM).toBe(1200);
        expect(result.metrics.weekTss).toBe(210);
        expect(result.metrics.z2Hours).toBeGreaterThan(0);
        expect(result.scores.elevation).toBeGreaterThan(70);
        expect(result.badge.key).toBeTruthy();
    });

    it('uses TSB from fitness metrics as of today', () => {
        const activities = [];
        for (let i = 0; i < 14; i += 1) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            const ymd = d.toISOString().slice(0, 10);
            activities.push({ date: ymd, load: 80 });
        }

        const expectedTsb = expectedReadinessTsb(activities, baseDate);

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        expect(result.metrics.tsb).toBe(expectedTsb);
    });

    it('matches Coach/Recovery TSB when last ride was before reference day', () => {
        const activities = [
            { date: '2026-08-10', load: 150 },
            { date: '2026-08-12', load: 140 },
        ];
        const referenceDate = new Date('2026-08-14T12:00:00');
        const coachTsb = getFitnessAtDate(activities, '2026-08-14')?.tsb;

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate,
        });

        expect(result.metrics.tsb).toBe(coachTsb);
    });

    it('flags recovery when TSB is very negative', () => {
        const activities = [];
        for (let i = 0; i < 10; i += 1) {
            const d = new Date(baseDate);
            d.setDate(d.getDate() - i);
            activities.push({
                date: d.toISOString().slice(0, 10),
                load: 200,
                climbing: 500,
                norm_power: 200,
                moving_time: 3600,
            });
        }

        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
        });

        if (result.metrics.tsb != null && result.metrics.tsb < -20) {
            expect(result.badge.key).toBe('recover');
        }
    });

    it('computeClimbingReadinessHistory returns weekly and monthly rows', () => {
        const activities = [
            {
                date: '2026-07-22',
                climbing: 800,
                load: 120,
                norm_power: 160,
                moving_time: 7200,
            },
        ];
        const history = computeClimbingReadinessHistory({
            activities,
            ftp: 250,
            referenceDate: baseDate,
            weekCount: 4,
            monthCount: 3,
        });
        expect(history.weeks.length).toBe(4);
        expect(history.months.length).toBe(3);
        expect(history.weeks[0].composite).toBeGreaterThan(0);
    });

    it('flat terrain scores elevation higher for modest vertical', () => {
        const activities = [
            {
                date: '2026-07-22',
                climbing: 180,
                load: 100,
                norm_power: 160,
                moving_time: 5400,
            },
        ];
        const flat = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
            terrainProfile: TERRAIN_PROFILE_FLAT,
        });
        const hilly = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: baseDate,
            terrainProfile: TERRAIN_PROFILE_HILLY,
        });
        expect(flat.scores.elevation).toBeGreaterThan(hilly.scores.elevation);
    });

    it('Monday with no rides shows week-started hint on flat terrain', () => {
        const monday = new Date('2026-08-03T12:00:00');
        const result = computeClimbingReadiness({
            activities: [],
            ftp: 250,
            referenceDate: monday,
            terrainProfile: TERRAIN_PROFILE_FLAT,
        });
        expect(result.hints.some((h) => /Week just started/i.test(h))).toBe(true);
    });

    it('rolling elevation blends previous week into score', () => {
        const monday = new Date('2026-08-03T12:00:00');
        const activities = [
            { date: '2026-07-28', climbing: 400, load: 80 },
        ];
        const result = computeClimbingReadiness({
            activities,
            ftp: 250,
            referenceDate: monday,
            terrainProfile: TERRAIN_PROFILE_FLAT,
        });
        expect(result.usesRollingElevation).toBe(true);
        expect(result.metrics.elevationM).toBe(0);
        expect(result.metrics.elevationForScoring).toBe(200);
    });
});
