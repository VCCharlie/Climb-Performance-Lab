import { describe, it, expect } from 'vitest';
import {
    SCRUB_GESTURE_THRESHOLD_PX,
    classifyTouchGesture,
    computeFitnessChartYDomain,
    findNearestDataIndexByX,
} from '../../utils/chartTouchScrubber';

const SAMPLE_DATA = [
    { date: '2026-01-01', dateNum: new Date(2026, 0, 1).getTime(), ctl: 40, atl: 35, tsb: 5 },
    { date: '2026-01-02', dateNum: new Date(2026, 0, 2).getTime(), ctl: 42, atl: 38, tsb: 4 },
    { date: '2026-01-03', dateNum: new Date(2026, 0, 3).getTime(), ctl: 44, atl: 50, tsb: -6 },
    { date: '2026-01-04', dateNum: new Date(2026, 0, 4).getTime(), ctl: 45, atl: 48, tsb: -3 },
    { date: '2026-01-05', dateNum: new Date(2026, 0, 5).getTime(), ctl: 46, atl: 42, tsb: 4 },
];

const CHART_RECT = {
    left: 100,
    width: 300,
    marginLeft: 36,
    marginRight: 8,
};

describe('classifyTouchGesture', () => {
    it('returns pending for tiny movement', () => {
        expect(classifyTouchGesture(2, 3, SCRUB_GESTURE_THRESHOLD_PX)).toBe('pending');
    });

    it('detects vertical scroll intent', () => {
        expect(classifyTouchGesture(4, 24, SCRUB_GESTURE_THRESHOLD_PX)).toBe('vertical');
    });

    it('detects horizontal scrub intent', () => {
        expect(classifyTouchGesture(30, 8, SCRUB_GESTURE_THRESHOLD_PX)).toBe('horizontal');
    });
});

describe('findNearestDataIndexByX', () => {
    it('returns 0 for left edge of plot area', () => {
        const idx = findNearestDataIndexByX(SAMPLE_DATA, CHART_RECT.left + CHART_RECT.marginLeft, CHART_RECT);
        expect(idx).toBe(0);
    });

    it('returns last index for right edge of plot area', () => {
        const rightEdge = CHART_RECT.left + CHART_RECT.width - CHART_RECT.marginRight;
        const idx = findNearestDataIndexByX(SAMPLE_DATA, rightEdge, CHART_RECT);
        expect(idx).toBe(SAMPLE_DATA.length - 1);
    });

    it('snaps to nearest date in the middle', () => {
        const midX = CHART_RECT.left + CHART_RECT.width / 2;
        const idx = findNearestDataIndexByX(SAMPLE_DATA, midX, CHART_RECT);
        expect(idx).toBeGreaterThanOrEqual(1);
        expect(idx).toBeLessThanOrEqual(3);
    });
});

describe('computeFitnessChartYDomain', () => {
    it('includes zero when TSB is negative', () => {
        const [yMin] = computeFitnessChartYDomain(SAMPLE_DATA);
        expect(yMin).toBeLessThanOrEqual(0);
    });

    it('pads extremes for readability', () => {
        const [yMin, yMax] = computeFitnessChartYDomain(SAMPLE_DATA);
        expect(yMax).toBeGreaterThan(50);
        expect(yMin).toBeLessThan(-6);
    });

    it('returns a sensible default for empty data', () => {
        expect(computeFitnessChartYDomain([])).toEqual([-10, 10]);
    });
});
