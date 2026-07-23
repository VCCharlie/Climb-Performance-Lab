import { describe, it, expect } from 'vitest';
import { scanClimbPersonalBests, formatPbSummary, hasStoredClimbPb, countClimbsWithPb } from '../../utils/climbPersonalBests';

const climbs = [
    { id: 'fr_alpe', name: "Alpe d'Huez" },
    { id: 'it_stelvio', name: 'Passo dello Stelvio' },
];

describe('scanClimbPersonalBests', () => {
    it('matches activities by title and keeps best NP', () => {
        const pbs = scanClimbPersonalBests(
            [
                { id: '1', title: 'Morning Alpe d Huez', norm_power: 250, date: '2026-01-01', moving_time: 3600 },
                { id: '2', title: 'Alpe d Huez PR attempt', norm_power: 265, date: '2026-02-01', moving_time: 3500 },
            ],
            climbs,
        );

        expect(pbs.fr_alpe?.normPower).toBe(265);
        expect(pbs.fr_alpe?.activityId).toBe('2');
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
});
