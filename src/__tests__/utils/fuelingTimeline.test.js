import { describe, it, expect } from 'vitest';
import {
    buildGenericFuelingTimeline,
    buildRaceFuelingTimeline,
    resolveFuelingTimeline,
} from '../../utils/fuelingTimeline';

describe('buildGenericFuelingTimeline', () => {
    it('creates 20-minute drink reminders', () => {
        const events = buildGenericFuelingTimeline(60, 0.9);
        expect(events).toHaveLength(3);
        expect(events[0]).toMatchObject({ time: 20, action: 'Drink', kind: 'drink' });
    });

    it('adds gel at 40 minutes and bar at 80 when intensity is lower', () => {
        const events = buildGenericFuelingTimeline(80, 0.8);
        expect(events.find((e) => e.time === 40)).toMatchObject({ kind: 'gel' });
        expect(events.find((e) => e.time === 80)).toMatchObject({ kind: 'bar' });
    });
});

describe('buildRaceFuelingTimeline', () => {
    it('orders events by climb start times', () => {
        const events = buildRaceFuelingTimeline([
            {
                climb: { name: 'Alpe d\'Huez' },
                timeMinutes: 60,
                cumulativeTime: 90,
                recovery: 30,
            },
            {
                climb: { name: 'Galibier' },
                timeMinutes: 45,
                cumulativeTime: 165,
                recovery: 30,
            },
        ]);

        expect(events.some((e) => e.kind === 'climb' && e.climbName === 'Alpe d\'Huez')).toBe(true);
        expect(events.some((e) => e.kind === 'climb' && e.climbName === 'Galibier')).toBe(true);
        expect(events[0].time).toBe(0);
        for (let i = 1; i < events.length; i += 1) {
            expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time);
        }
    });
});

describe('resolveFuelingTimeline', () => {
    it('prefers race climb timeline when fromRacePacing', () => {
        const raceTimeline = [{ time: 0, action: 'Start', kind: 'climb' }];
        const result = resolveFuelingTimeline({
            fromRacePacing: true,
            raceClimbTimeline: raceTimeline,
            durationMinutes: 180,
            intensity: 0.85,
        });
        expect(result).toEqual(raceTimeline);
    });

    it('falls back to generic cadence without race plan', () => {
        const result = resolveFuelingTimeline({
            fromRacePacing: false,
            raceClimbTimeline: [],
            durationMinutes: 40,
            intensity: 0.85,
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].time).toBe(20);
    });
});
