import { describe, it, expect } from 'vitest';
import {
    summarizeFluidWeekPattern,
    projectFtpScenarios,
    projectFitnessMilestones,
    buildCoachPlanOutlook,
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
                athlete: { ftp: 260 },
                fitness: { ctl: 50, atl: 55, tsb: -5 },
            },
            activities: [],
            weeklyHours: 5,
            referenceYmd: '2026-08-05',
        });
        expect(outlook.weeklyPattern.plannedWeeklyTss).toBeGreaterThan(0);
        expect(outlook.ftpScenarios).toHaveLength(3);
        expect(outlook.fitnessMilestones).toHaveLength(3);
        expect(outlook.assumptions.length).toBeGreaterThan(0);
    });
});
