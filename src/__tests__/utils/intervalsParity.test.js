/**
 * Parity tests: cloud/Python-shaped payloads must normalize like direct API payloads.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    normalizeIntervalsActivity,
    normalizeIntervalsActivityFromAny,
    isRawIntervalsApiPayload,
    cloudPayloadToRawShape,
    filterNonEmptyIntervalsActivities,
} from '../../utils/intervals';

const fixturesDir = resolve(__dirname, '../fixtures');
const fixture = JSON.parse(readFileSync(resolve(fixturesDir, 'sample-intervals-api.json'), 'utf-8'));

describe('isRawIntervalsApiPayload', () => {
    it('detects raw API activities', () => {
        expect(isRawIntervalsApiPayload(fixture[0])).toBe(true);
        expect(isRawIntervalsApiPayload(fixture[1])).toBe(true);
    });

    it('detects already-normalized cloud output', () => {
        const cloud = {
            id: 'i1',
            date: '2025-06-15',
            title: 'Test ride',
            type: 'Ride',
            distance: 42.5,
            climbing: 500,
            moving_time: 3600,
            avg_power: 200,
            norm_power: 210,
        };
        expect(isRawIntervalsApiPayload(cloud)).toBe(false);
    });
});

describe('normalizeIntervalsActivityFromAny', () => {
    it('matches direct normalization for raw API fixtures', () => {
        for (const raw of fixture) {
            const direct = normalizeIntervalsActivity(raw);
            const viaAny = normalizeIntervalsActivityFromAny(raw);
            expect(viaAny).toEqual(direct);
        }
    });

    it('normalizes cloud-shaped payloads to the same canonical fields', () => {
        const raw = fixture[0];
        const direct = normalizeIntervalsActivity(raw);
        const cloudShaped = {
            id: direct.id,
            date: direct.date,
            title: direct.title,
            type: direct.type,
            moving_time: direct.moving_time,
            distance: direct.distance,
            climbing: direct.climbing,
            avg_speed: Number(direct.avg_speed),
            norm_power: direct.norm_power,
            avg_power: direct.avg_power,
            avg_hr: direct.avg_hr,
            load: direct.load,
            work: direct.work,
            rpe: direct.rpe,
            max_power: direct.max_power,
            max_hr: direct.max_hr,
            best_1min: direct.best_1min,
            best_5min: direct.best_5min,
            best_10min: direct.best_10min,
            best_20min: direct.best_20min,
            best_60min: direct.best_60min,
            strava_id: direct.strava_id,
        };

        const fromCloud = normalizeIntervalsActivityFromAny(cloudShaped);
        expect(fromCloud.id).toBe(direct.id);
        expect(fromCloud.date).toBe(direct.date);
        expect(fromCloud.title).toBe(direct.title);
        expect(fromCloud.distance).toBe(direct.distance);
        expect(fromCloud.avg_power).toBe(direct.avg_power);
        expect(fromCloud.norm_power).toBe(direct.norm_power);
        expect(fromCloud.load).toBe(direct.load);
        expect(fromCloud.best_20min).toBe(direct.best_20min);
    });

    it('round-trips cloud payload through cloudPayloadToRawShape', () => {
        const direct = normalizeIntervalsActivity(fixture[1]);
        const cloud = {
            id: direct.id,
            date: direct.date,
            title: direct.title,
            type: direct.type,
            moving_time: direct.moving_time,
            distance: direct.distance,
            climbing: direct.climbing,
            avg_speed: Number(direct.avg_speed),
            avg_power: direct.avg_power,
            norm_power: direct.norm_power,
            avg_hr: direct.avg_hr,
            load: direct.load,
        };
        const reshaped = cloudPayloadToRawShape(cloud);
        expect(reshaped.name).toBe(direct.title);
        expect(reshaped.moving_time).toBe(direct.moving_time);
        expect(reshaped.distance).toBeCloseTo(direct.distance * 1000, 0);
    });
});

describe('filterNonEmptyIntervalsActivities', () => {
    it('keeps activities with distance, time, or power', () => {
        const filtered = filterNonEmptyIntervalsActivities([
            { id: '1', distance: 0, moving_time: 0, avg_power: 0 },
            { id: '2', distance: 10, moving_time: 0, avg_power: 0 },
            { id: '3', distance: 0, moving_time: 1800, avg_power: 0 },
            { id: '4', distance: 0, moving_time: 0, avg_power: 150 },
        ]);
        expect(filtered.map((a) => a.id)).toEqual(['2', '3', '4']);
    });
});
