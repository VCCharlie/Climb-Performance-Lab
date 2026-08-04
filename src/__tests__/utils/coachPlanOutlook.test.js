import { describe, it, expect } from 'vitest';
import {
    summarizeFluidWeekPattern,
    summarizeAlternatingWeekPattern,
    projectFtpScenarios,
    projectFitnessMilestones,
    buildCoachPlanOutlook,
    buildTargetFtpOutlook,
} from '../../utils/coach/coachPlanOutlook';

const templateSessions = [
    { day: 'Monday', plannedStimulus: 'rest', workoutName: 'Rest' },
    { day: 'Tuesday', plannedStimulus: 'endurance', workoutName: 'Z2' },
    { day: 'Wednesday', plannedStimulus: 'rest', workoutName: 'Rest' },
    { day: 'Thursday', plannedStimulus: 'sweetspot', workoutName: 'SS blocks' },
    { day: 'Friday', plannedStimulus: 'rest', workoutName: 'Rest' },
    { day: 'Saturday', plannedStimulus: 'endurance', workoutName: 'Long Z2' },
    { day: 'Sunday', plannedStimulus: 'recovery', workoutName: 'Recovery' },
];

describe('coachPlanOutlook', () => {
    it('summarizeFluidWeekPattern counts quality sessions and TSS', () => {
        const pattern = summarizeFluidWeekPattern(templateSessions, 5);
        expect(pattern.qualitySessions).toBe(1);
        expect(pattern.plannedWeeklyTss).toBeGreaterThan(150);
        expect(pattern.sessions).toHaveLength(7);
    });

    it('projectFtpScenarios returns higher FTP for longer horizons', () => {
        const scenarios = projectFtpScenarios({
            currentFtp: 250,
            templateSessions,
            weeklyHours: 5,
            currentCtl: 45,
        });
        expect(scenarios).toHaveLength(3);
        expect(scenarios[2].projectedFtpMid).toBeGreaterThan(scenarios[0].projectedFtpMid);
        expect(scenarios[1].gainWattsMid).toBeGreaterThan(0);
    });

    it('projectFitnessMilestones increases CTL when plan is repeated', () => {
        const milestones = projectFitnessMilestones({
            activities: [{ id: '1', date: '2026-07-01', load: 80 }],
            templateSessions,
            weeklyHours: 5,
            referenceYmd: '2026-08-01',
        });
        expect(milestones[2].ctl).toBeGreaterThan(milestones[0].ctl);
    });

    it('buildCoachPlanOutlook bundles week plan and scenarios', () => {
        const outlook = buildCoachPlanOutlook({
            weekPlan: {
                mondayYmd: '2026-08-03',
                sundayYmd: '2026-08-09',
                targetTss: 250,
                actualTss: 100,
                compliancePct: 40,
                sessions: templateSessions,
                unavailableDates: [],
            },
            coachFeatures: {
                athlete: { ftp: 260, targetFtp: 300 },
                fitness: { ctl: 50, atl: 55, tsb: -5 },
            },
            activities: [],
            weeklyHours: 5,
            referenceYmd: '2026-08-05',
        });
        expect(outlook.weeklyPattern.plannedWeeklyTss).toBeGreaterThan(0);
        expect(outlook.ftpScenarios).toHaveLength(3);
        expect(outlook.fitnessMilestones).toHaveLength(3);
        expect(outlook.targetFtpOutlook.targetFtp).toBe(300);
        expect(outlook.targetFtpOutlook.gapWatts).toBe(40);
        expect(outlook.assumptions.length).toBeGreaterThan(0);
    });

    it('includes week 2 when provided', () => {
        const week2Sessions = templateSessions.map((s, i) => ({
            ...s,
            plannedStimulus: i === 3 ? 'threshold' : s.plannedStimulus,
        }));
        const outlook = buildCoachPlanOutlook({
            weekPlan: {
                mondayYmd: '2026-08-03',
                sundayYmd: '2026-08-09',
                sessions: templateSessions,
            },
            week2Plan: {
                mondayYmd: '2026-08-10',
                sundayYmd: '2026-08-16',
                sessions: week2Sessions,
            },
            coachFeatures: {
                athlete: { ftp: 260 },
                fitness: { ctl: 50 },
            },
            activities: [],
            weeklyHours: 5,
            referenceYmd: '2026-08-05',
        });
        expect(outlook.includeWeek2).toBe(true);
        expect(outlook.week2Range.mondayYmd).toBe('2026-08-10');
        expect(outlook.weeklyPattern.week2Pattern).toBeTruthy();
    });

    it('buildTargetFtpOutlook estimates weeks to target', () => {
        const ftpScenarios = projectFtpScenarios({
            currentFtp: 250,
            templateSessions,
            weeklyHours: 5,
            currentCtl: 45,
        });
        const target = buildTargetFtpOutlook({
            currentFtp: 250,
            targetFtp: 280,
            ftpScenarios,
        });
        expect(target.gapWatts).toBe(30);
        expect(target.estimatedWeeksToTarget).toBeGreaterThan(0);
        expect(target.milestones[0].reachesTarget).toBe(false);
    });

    it('summarizeAlternatingWeekPattern averages two weeks', () => {
        const week2 = templateSessions.map((s) => ({
            ...s,
            plannedStimulus: 'rest',
        }));
        const pattern = summarizeAlternatingWeekPattern(templateSessions, week2, 5);
        expect(pattern.week2Pattern).toBeTruthy();
        expect(pattern.plannedWeeklyTss).toBeLessThan(summarizeFluidWeekPattern(templateSessions, 5).plannedWeeklyTss);
    });
});
