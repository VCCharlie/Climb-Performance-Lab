import { describe, it, expect } from 'vitest';
import { buildCoachContext } from '../../utils/coach/coachPayloadBuilder';
import { selectStimulus } from '../../utils/coach/stimulusSelector';
import { buildFluidWorkout } from '../../utils/coach/fluidWorkoutTemplates';
import { analyzeTrainingPeriod } from '../../utils/coach/coachPeriodAnalysis';

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
        expect(ctx.selectedStimulus).toBeTruthy();
        expect(ctx.fluidWorkout).toBeTruthy();
        expect(ctx.fluidWorkout.name).toBeTruthy();
        expect(ctx.stimulusRationale).toBeTruthy();
    });

    it('includes fitness metrics', () => {
        const ctx = buildCoachContext(sampleActivities, { ftp: 250 });
        expect(typeof ctx.fitness.ctl).toBe('number');
        expect(typeof ctx.fitness.tsb).toBe('number');
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
