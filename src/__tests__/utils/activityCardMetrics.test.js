import { describe, it, expect } from 'vitest';
import { getActivityCardMetrics, ACTIVITY_CARD_HEADER_KEYS } from '../../utils/activityCardMetrics';

const essentialCols = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Title' },
    { key: 'moving_time', label: 'Time' },
    { key: 'distance', label: 'Dist' },
    { key: 'climbing', label: 'Elev' },
    { key: 'norm_power', label: 'NP' },
    { key: 'load', label: 'Load' },
];

const sampleAct = {
    id: '1',
    date: '2024-06-15',
    type: 'Ride',
    title: 'Morning ride',
    moving_time: '01:30:00',
    distance: 42.5,
    climbing: 850,
    norm_power: 210,
    load: 95,
};

describe('activityCardMetrics', () => {
    it('skips header keys date, type, title', () => {
        expect(ACTIVITY_CARD_HEADER_KEYS.has('date')).toBe(true);
        const metrics = getActivityCardMetrics(sampleAct, essentialCols, 250);
        const keys = metrics.map((m) => m.key);
        expect(keys).not.toContain('date');
        expect(keys).not.toContain('type');
        expect(keys).not.toContain('title');
    });

    it('formats essential metrics for a card', () => {
        const metrics = getActivityCardMetrics(sampleAct, essentialCols, 250);
        expect(metrics).toEqual([
            { key: 'moving_time', label: 'Time', value: '1:30:00', tone: 'muted' },
            { key: 'distance', label: 'Dist', value: '42.5 km', tone: 'muted' },
            { key: 'climbing', label: 'Elev', value: '850 m', tone: 'muted' },
            { key: 'norm_power', label: 'NP', value: '210 W', tone: 'np' },
            { key: 'load', label: 'Load', value: '95', tone: 'load' },
        ]);
    });

    it('computes IF when column is visible', () => {
        const cols = [...essentialCols, { key: 'intensity_factor', label: 'IF' }];
        const metrics = getActivityCardMetrics(sampleAct, cols, 250);
        const ifMetric = metrics.find((m) => m.key === 'intensity_factor');
        expect(ifMetric?.value).toBe('0.84');
    });

    it('omits zero or missing numeric fields', () => {
        const sparse = { ...sampleAct, climbing: 0, norm_power: null, load: 0 };
        const metrics = getActivityCardMetrics(sparse, essentialCols, 250);
        expect(metrics.map((m) => m.key)).toEqual(['moving_time', 'distance']);
    });
});
