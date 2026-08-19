import { describe, it, expect } from 'vitest';
import {
    buildClimbMapDisplayItems,
    clusterClimbsByGrid,
    filterClimbsToBounds,
    gridCellKey,
    CLIMB_MAP_CLUSTER_COUNT_THRESHOLD,
} from '../../utils/climbMapMarkerIndex';

const sampleClimbs = [
    { id: 'a', name: 'A', lat: 46.0, lon: 8.0 },
    { id: 'b', name: 'B', lat: 46.01, lon: 8.01 },
    { id: 'c', name: 'C', lat: 48.0, lon: 10.0 },
];

describe('climbMapMarkerIndex', () => {
    it('clusters nearby climbs at low zoom', () => {
        const { items, mode } = buildClimbMapDisplayItems(sampleClimbs, { zoom: 6 });
        expect(mode).toBe('cluster');
        const cluster = items.find((i) => i.kind === 'cluster');
        expect(cluster).toBeTruthy();
        expect(cluster.count).toBeGreaterThanOrEqual(2);
    });

    it('shows direct markers at high zoom for small sets', () => {
        const { items, mode } = buildClimbMapDisplayItems(sampleClimbs.slice(0, 2), { zoom: 12 });
        expect(mode).toBe('direct');
        expect(items.every((i) => i.kind === 'single')).toBe(true);
    });

    it('filters climbs to viewport bounds', () => {
        const bounds = { north: 47, south: 45, east: 9, west: 7 };
        const filtered = filterClimbsToBounds(sampleClimbs, bounds);
        expect(filtered.map((c) => c.id)).toEqual(['a', 'b']);
    });

    it('caps cluster markers when output still exceeds max', () => {
        const many = Array.from({ length: 900 }, (_, i) => ({
            id: `c${i}`,
            name: `Climb ${i}`,
            lat: 40 + i * 0.02,
            lon: 0 + i * 0.02,
        }));
        const { items, mode } = buildClimbMapDisplayItems(many, { zoom: 12, maxDirect: 100 });
        expect(mode).toBe('capped');
        expect(items.length).toBe(100);
    });

    it('falls back safely on invalid input', () => {
        const { items, mode } = buildClimbMapDisplayItems(null, { zoom: 6 });
        expect(mode).toBe('direct');
        expect(items).toEqual([]);
    });

    it('groups climbs sharing a grid cell key', () => {
        const keyA = gridCellKey(46.0, 8.0, 0.45);
        const keyB = gridCellKey(46.05, 8.05, 0.45);
        expect(keyA).toBe(keyB);
        const clustered = clusterClimbsByGrid(sampleClimbs.slice(0, 2), 0.45);
        expect(clustered.length).toBe(1);
        expect(clustered[0].kind).toBe('cluster');
    });

    it('clusters large in-view sets even at moderate zoom', () => {
        const many = Array.from({ length: CLIMB_MAP_CLUSTER_COUNT_THRESHOLD + 5 }, (_, i) => ({
            id: `x${i}`,
            lat: 45 + (i % 20) * 0.02,
            lon: 6 + Math.floor(i / 20) * 0.5,
        }));
        const { mode, items } = buildClimbMapDisplayItems(many, { zoom: 10 });
        expect(mode).toBe('cluster');
        expect(items.length).toBeLessThan(many.length);
    });
});
