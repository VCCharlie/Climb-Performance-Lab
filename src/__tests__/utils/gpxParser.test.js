import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseGpxToProfilePoints, trackSamplesToProfilePoints } from '../../utils/gpxParser.js';

const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../fixtures/sample-climb.gpx',
);

describe('gpxParser', () => {
    it('trackSamplesToProfilePoints builds cumulative distance and gradient', () => {
        const samples = [
            { lat: 45.0, lon: 6.0, ele: 100 },
            { lat: 45.01, lon: 6.0, ele: 200 },
        ];
        const pts = trackSamplesToProfilePoints(samples);
        expect(pts.length).toBe(2);
        expect(pts[1].distanceKm).toBeGreaterThan(0);
        expect(pts[1].gradient).toBeGreaterThan(0);
    });

    it('parseGpxToProfilePoints reads trkpt with elevation', () => {
        const xml = readFileSync(fixturePath, 'utf8');
        const result = parseGpxToProfilePoints(xml);
        expect(result.points.length).toBeGreaterThanOrEqual(4);
        expect(result.totalDistanceKm).toBeGreaterThan(0);
        expect(result.elevationGainM).toBeGreaterThan(0);
        expect(result.points[0].elevation).toBe(1000);
    });
});
