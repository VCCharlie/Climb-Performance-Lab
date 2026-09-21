import { describe, it, expect, vi } from 'vitest';
import {
    applyDualRangeToMetricFilters,
    computeDistanceBoundsFromActivities,
    computeDurationBoundsFromActivities,
    readDualRangeValues,
    snapMetricStep,
} from '../../utils/metricRangeBounds';

describe('metricRangeBounds', () => {
    const activities = [
        { distance: 42, moving_time: '1:30:00' },
        { distance: 120, moving_time: '4:15:00' },
        { distance: 15, moving_time: '0:45:00' },
    ];

    it('computes distance bounds from activities', () => {
        const bounds = computeDistanceBoundsFromActivities(activities);
        expect(bounds).toEqual({ min: 15, max: 120, count: 3 });
    });

    it('computes duration bounds in minutes', () => {
        const bounds = computeDurationBoundsFromActivities(activities);
        expect(bounds?.min).toBe(45);
        expect(bounds?.max).toBe(255);
        expect(bounds?.count).toBe(3);
    });

    it('clears filters when slider spans full dataset', () => {
        const bounds = { min: 10, max: 100, count: 5 };
        const onMinChange = vi.fn();
        const onMaxChange = vi.fn();
        applyDualRangeToMetricFilters(10, 100, bounds, onMinChange, onMaxChange, 1);
        expect(onMinChange).toHaveBeenCalledWith('');
        expect(onMaxChange).toHaveBeenCalledWith('');
    });

    it('reads empty filter values as dataset bounds', () => {
        const bounds = { min: 5, max: 50, count: 2 };
        expect(readDualRangeValues('', '', bounds)).toEqual({ low: 5, high: 50 });
    });

    it('snaps values to step', () => {
        expect(snapMetricStep(12.3, 5)).toBe(10);
        expect(snapMetricStep(12.6, 1)).toBe(13);
    });
});
