import { describe, it, expect } from 'vitest';
import { buildCoachContext } from '../../utils/coach/coachPayloadBuilder';
import { selectStimulus } from '../../utils/coach/stimulusSelector';
import { buildFluidWorkout } from '../../utils/coach/fluidWorkoutTemplates';
import { analyzeTrainingPeriod } from '../../utils/coach/coachPeriodAnalysis';
import { FTP_SOURCE_ESTIMATED_20 } from '../../utils/profileFtp';

const sampleActivities = [
    {
        id: '1',
        date: '2026-07-28',
        type: 'Ride',
        moving_time: 3600,
        distance: 35,
        load: 65,
        norm_power: 180,
        avg_power: 170,
        best_20min: 200,
        best_5min: 250,
    },
    {
        id: '2',
        date: '2026-07-30',
        type: 'Ride',
        moving_time: 4500,
        distance: 42,
        load: 95,
        norm_power: 230,
        avg_power: 220,
        best_20min: 235,
        best_5min: 280,
    },
    {
        id: '3',
        date: '2026-08-01',
        type: 'Ride',
        moving_time: 5400,
        distance: 50,
        load: 55,
        norm_power: 150,
        avg_power: 145,
        best_20min: 0,
        best_5min: 0,
    },
];

describe('buildCoachContext', () => {
    it('returns coach context with stimulus and fluid workout', () => {
        const ctx = buildCoachContext(sampleActivities, { ftp: 250, weight: 75 }, { weeklyHoursTarget: 5 });
        expect(ctx.athlete.ftp).toBe(250);
        expect(ctx.weeklyLoad.targetTss).toBe(250);
        expect(ctx.weeklyLoad.targetSource).toBe('hours-budget');
        expect(ctx.selectedStimulus).toBeTruthy();
        expect(ctx.fluidWorkout).toBeTruthy();
        expect(ctx.fluidWorkout.name).toBeTruthy();
        expect(ctx.stimulusRationale).toBeTruthy();
    });

    it('weeklyLoad uses calendar week TSS aligned with training status strip', () => {
        const activities = [
            { id: 'old1', date: '2026-08-20', type: 'Ride', load: 120, moving_time: 3600, norm_power: 180 },
            { id: 'old2', date: '2026-08-21', type: 'Ride', load: 130, moving_time: 3600, norm_power: 180 },
            { id: 'old3', date: '2026-08-22', type: 'Ride', load: 119, moving_time: 3600, norm_power: 180 },
            { id: 'wk1', date: '2026-08-24', type: 'Ride', load: 30, moving_time: 1800, norm_power: 150 },
            { id: 'wk2', date: '2026-08-26', type: 'Ride', load: 27, moving_time: 1800, norm_power: 150 },
        ];

        const ctx = buildCoachContext(
            activities,
            { ftp: 250, weeklyHoursTarget: 5 },
            { endDate: '2026-08-26', weeklyHoursTarget: 5 },
        );

        expect(ctx.weeklyLoad.actualTss).toBe(57);
        expect(ctx.weeklyLoad.targetTss).toBe(250);
        expect(ctx.weeklyLoad.compliancePct).toBe(Math.round((57 / 250) * 100));
        expect(ctx.weeklyLoad.weekLabel).toMatch(/24 Aug/);
    });

    it('includes fitness metrics', () => {
        const ctx = buildCoachContext(sampleActivities, { ftp: 250 });
        expect(typeof ctx.fitness.ctl).toBe('number');
        expect(typeof ctx.fitness.tsb).toBe('number');
        expect(ctx.fitnessHistory).toBeTruthy();
        expect(ctx.fitnessHistory.source).toBe('local');
        expect(Array.isArray(ctx.fitnessHistory.dailyLast14d)).toBe(true);
    });

    it('includes planOutlook from fluid week plan', () => {
        const ctx = buildCoachContext(sampleActivities, {
            ftp: 250,
            weeklyHoursTarget: 5,
            goals: { targetFtp: 280 },
        });
        expect(ctx.planOutlook).toBeTruthy();
        expect(ctx.planOutlook.weeklyPattern.plannedWeeklyTss).toBeGreaterThan(0);
        expect(ctx.planOutlook.ftpScenarios.length).toBe(3);
        expect(ctx.planOutlook.targetFtpOutlook.targetFtp).toBe(280);
        expect(ctx.athlete.targetFtp).toBe(280);
        expect(ctx.weekPlanSummary.sessions[0].estimatedTss).toBeDefined();
    });

    it('includes todayFocus and weekPlanSummary', () => {
        const ctx = buildCoachContext(sampleActivities, { ftp: 250, weeklyHoursTarget: 5 });
        expect(ctx.todayFocus).toBeTruthy();
        expect(ctx.todayFocus.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(ctx.weekPlanSummary).toBeTruthy();
        expect(ctx.weekPlanSummary.sessions).toHaveLength(7);
    });

    it('includes activityLog with distance summaries', () => {
        const ctx = buildCoachContext(sampleActivities, { ftp: 250 });
        expect(ctx.activityLog).toBeTruthy();
        expect(ctx.activityLog.totals.distanceKm).toBeGreaterThan(0);
        expect(ctx.periodSummary.distanceKm28d).toBeGreaterThan(0);
        expect(ctx.activityLog.rides[0].distance).toBeDefined();
    });

    it('uses estimated 20-min FTP when ftpSource is estimated_20', () => {
        const activities = [
            { id: '1', date: '2026-07-28', best_20min: 300, load: 50, norm_power: 180, moving_time: 3600 },
        ];
        const ctx = buildCoachContext(activities, {
            ftp: 200,
            ftpSource: FTP_SOURCE_ESTIMATED_20,
        });
        expect(ctx.athlete.ftp).toBe(285);
        expect(ctx.athlete.ftpSource).toBe(FTP_SOURCE_ESTIMATED_20);
    });
});

describe('selectStimulus', () => {
    it('returns recovery when TSB is very negative', () => {
        const features = {
            fitness: { tsb: -30, atl: 80, ctl: 50 },
            intensityProfile: { hardSessionCount: 0, daysSinceHard: 5, sweetspotPct: 10, thresholdPct: 5, vo2Pct: 0, z1z2Pct: 80 },
            powerCeiling: { best5min: 0, sustainedWeakness: false },
            athlete: { ftp: 250 },
            weeklyLoad: { compliancePct: 100 },
        };
        expect(selectStimulus(features)).toBe('recovery');
    });
});

describe('buildFluidWorkout', () => {
    it('builds sweetspot workout with watt ranges when FTP set', () => {
        const w = buildFluidWorkout('sweetspot', { ftp: 250 });
        expect(w.stimulus).toBe('sweetspot');
        expect(w.mainSet.blocks.length).toBeGreaterThan(0);
        expect(w.mainSet.blocks[0].wattRange).toContain('W');
        expect(w.shortOnTimeAlternative).toBeTruthy();
    });
});

describe('analyzeTrainingPeriod', () => {
    it('returns verdict and SWOT for period', () => {
        const review = analyzeTrainingPeriod(sampleActivities, { ftp: 250, weeklyHoursTarget: 5 }, 4);
        expect(review.weeks).toBe(4);
        expect(review.verdict.headline).toBeTruthy();
        expect(review.swot.strengths.length).toBeGreaterThan(0);
        expect(review.verdict.nextSteps.length).toBeGreaterThan(0);
    });
});
