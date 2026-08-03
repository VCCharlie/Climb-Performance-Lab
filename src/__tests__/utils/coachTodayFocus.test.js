import { describe, it, expect } from 'vitest';
import { buildTodayFocus, rateTodayRideAnswer } from '../../utils/coach/coachTodayFocus';

describe('coachTodayFocus', () => {
    it('buildTodayFocus lists rides for today', () => {
        const focus = buildTodayFocus(
            [{ id: '1', date: '2026-08-03', type: 'Ride', norm_power: 180, load: 45, moving_time: '1:00:00' }],
            250,
            { name: 'Z2 Endurance', stimulus: 'endurance', stimulusLabel: 'Endurance' },
            '2026-08-03',
        );
        expect(focus.date).toBe('2026-08-03');
        expect(focus.dayName).toBe('Monday');
        expect(focus.hasLoggedRide).toBe(true);
        expect(focus.loggedRides[0].stimulus).toBe('endurance');
    });

    it('rateTodayRideAnswer explains when no ride logged', () => {
        const focus = buildTodayFocus([], 250, { stimulus: 'endurance', name: 'Z2' }, '2026-08-03');
        const text = rateTodayRideAnswer(focus, { sessions: [{ isToday: true, stimulus: 'endurance' }] }, { tsb: 0 });
        expect(text).toMatch(/don't see a ride logged/i);
        expect(text).toMatch(/Monday/);
    });

    it('rateTodayRideAnswer rates an easy ride against plan', () => {
        const focus = buildTodayFocus(
            [{ id: '1', date: '2026-08-03', type: 'Ride', norm_power: 175, load: 40, moving_time: '1:15:00', title: 'Morning spin' }],
            250,
            { name: 'Z2 Endurance', stimulus: 'endurance', stimulusLabel: 'Endurance' },
            '2026-08-03',
        );
        const text = rateTodayRideAnswer(
            focus,
            { sessions: [{ isToday: true, stimulus: 'endurance', workoutName: 'Z2 Endurance' }], actualTss: 400, targetTss: 250, compliancePct: 160 },
            { tsb: -8 },
        );
        expect(text).toMatch(/Morning spin/);
        expect(text).toMatch(/Verdict/i);
    });
});
