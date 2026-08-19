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
            {
                key: 'norm_power',
                label: 'NP',
                value: '210 W',
                tone: 'zone',
                color: '#22c55e',
                title: '210 — Z3 Tempo (84% FTP)',
            },
            { key: 'load', label: 'Load', value: '95', tone: 'load' },
        ]);
    });

    it('computes IF when column is visible', () => {
        const cols = [...essentialCols, { key: 'intensity_factor', label: 'IF' }];
        const metrics = getActivityCardMetrics(sampleAct, cols, 250);
        const ifMetric = metrics.find((m) => m.key === 'intensity_factor');
        expect(ifMetric?.value).toBe('0.84');
        expect(ifMetric?.tone).toBe('zone');
        expect(ifMetric?.color).toBe('#22c55e');
    });

    it('computes VI and EF when columns are visible', () => {
        const cols = [
            ...essentialCols,
            { key: 'variability_index', label: 'VI' },
            { key: 'efficiency_factor', label: 'EF' },
        ];
        const act = { ...sampleAct, avg_power: 200, avg_hr: 140 };
        const metrics = getActivityCardMetrics(act, cols, 250);
        const vi = metrics.find((m) => m.key === 'variability_index');
        const ef = metrics.find((m) => m.key === 'efficiency_factor');
        expect(vi?.value).toBe('1.05');
        expect(ef?.value).toBe('1.50');
    });

    it('colors average power and heart rate by profile zones', () => {
        const cols = [
            ...essentialCols,
            { key: 'avg_power', label: 'Avg' },
            { key: 'avg_hr', label: 'HR' },
        ];
        const act = { ...sampleAct, avg_power: 240, avg_hr: 152 };
        const metrics = getActivityCardMetrics(act, cols, 300, 190);
        const avg = metrics.find((m) => m.key === 'avg_power');
        const hr = metrics.find((m) => m.key === 'avg_hr');
        expect(avg?.color).toBe('#22c55e');
        expect(hr?.color).toBe('#22c55e');
        expect(hr?.value).toBe('152 bpm');
    });

    it('omits zero or missing numeric fields', () => {
        const sparse = { ...sampleAct, climbing: 0, norm_power: null, load: 0 };
        const metrics = getActivityCardMetrics(sparse, essentialCols, 250);
        expect(metrics.map((m) => m.key)).toEqual(['moving_time', 'distance']);
    });
});
