import { describe, it, expect } from 'vitest';
import { scanClimbPersonalBests, formatPbSummary, hasStoredClimbPb, countClimbsWithPb, summarizePbScanResult, formatPbScanFeedbackMessage } from '../../utils/climbPersonalBests';

const climbs = [
    { id: 'fr_alpe', name: "Alpe d'Huez" },
    { id: 'it_stelvio', name: 'Passo dello Stelvio' },
];

describe('scanClimbPersonalBests', () => {
    it('matches activities by title and keeps best NP', () => {
        const pbs = scanClimbPersonalBests(
            [
                { id: '1', title: 'Morning Alpe d Huez', norm_power: 250, date: '2026-01-01', moving_time: 3600, strava_id: 'strava-1' },
                { id: '2', title: 'Alpe d Huez PR attempt', norm_power: 265, date: '2026-02-01', moving_time: 3500, strava_id: 'strava-2' },
            ],
            climbs,
        );

        expect(pbs.fr_alpe?.normPower).toBe(265);
        expect(pbs.fr_alpe?.activityId).toBe('2');
        expect(pbs.fr_alpe?.stravaId).toBe('strava-2');
    });

    it('matches activities by description when title is generic', () => {
        const pbs = scanClimbPersonalBests(
            [
                {
                    id: '3',
                    title: 'Sunday ride',
                    description: 'MyCols: Passo dello Stelvio from Prato',
                    norm_power: 240,
                    date: '2026-03-01',
                    moving_time: 4000,
                },
            ],
            climbs,
        );

        expect(pbs.it_stelvio?.normPower).toBe(240);
        expect(pbs.it_stelvio?.matchSource).toBe('description');
    });

    it('formatPbSummary combines power and time', () => {
        const label = formatPbSummary({ normPower: 260, movingTimeSec: 2700 });
        expect(label).toContain('260');
        expect(label).toContain('45 min');
    });

    it('hasStoredClimbPb and countClimbsWithPb', () => {
        const pbs = {
            fr_alpe: { normPower: 250 },
            empty: {},
        };
        expect(hasStoredClimbPb(pbs, 'fr_alpe')).toBe(true);
        expect(hasStoredClimbPb(pbs, 'empty')).toBe(false);
        expect(countClimbsWithPb(pbs)).toBe(1);
    });

    it('summarizePbScanResult reports no change when scan matches same climbs', () => {
        const prev = {
            fr_alpe: { normPower: 265, movingTimeSec: 3500 },
        };
        const scanned = {
            fr_alpe: { normPower: 265, movingTimeSec: 3500, matchSource: 'title' },
        };
        const activities = [{ title: 'Alpe d Huez', norm_power: 265, moving_time: 3500 }];

        const summary = summarizePbScanResult(prev, scanned, activities);
        expect(summary.totalWithPb).toBe(1);
        expect(summary.newClimbs).toBe(0);
        expect(summary.improvedPbs).toBe(0);
        expect(formatPbScanFeedbackMessage(summary)).toContain('no new matches');
    });

    it('summarizePbScanResult counts new climbs', () => {
        const summary = summarizePbScanResult(
            {},
            { it_stelvio: { normPower: 240, matchSource: 'description' } },
            [{ description: 'Stelvio', norm_power: 240 }],
        );
        expect(summary.newClimbs).toBe(1);
        expect(summary.totalWithPb).toBe(1);
    });
});
