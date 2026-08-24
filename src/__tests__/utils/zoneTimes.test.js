import { describe, it, expect } from 'vitest';
import {
    mapIntervalsPowerZoneTimes,
    mapIntervalsHrZoneTimes,
    buildZoneTimesFields,
    hasZoneTimesData,
    protectZoneTimesOnMerge,
    sumPowerZoneSeconds,
    weeklyPowerZoneChartRows,
    monthlyPowerZoneChartRows,
    yearlyPowerZoneChartRows,
    powerZoneChartRows,
    powerZoneChartRowsAsPercent,
    computeZoneChartLookbackYmd,
    POWER_ZONE_COUNT,
} from '../../utils/zoneTimes';

describe('zoneTimes', () => {
    it('maps Intervals icu_zone_times objects to compact Z1-Z7 seconds', () => {
        const mapped = mapIntervalsPowerZoneTimes([
            { id: 'Z1', secs: 900 },
            { id: 'Z2', secs: 4200 },
            { id: 'Z3', secs: 1200 },
            { id: 'Z4', secs: 600 },
            { id: 'Z5', secs: 300 },
        ]);
        expect(mapped).toEqual([900, 4200, 1200, 600, 300, 0, 0]);
    });

    it('accepts compact numeric arrays', () => {
        const mapped = mapIntervalsPowerZoneTimes([100, 200, 0, 50, 0, 0, 0]);
        expect(mapped).toEqual([100, 200, 0, 50, 0, 0, 0]);
    });

    it('returns null when all zones are zero', () => {
        expect(mapIntervalsPowerZoneTimes([{ id: 'Z1', secs: 0 }])).toBeNull();
        expect(mapIntervalsPowerZoneTimes(null)).toBeNull();
    });

    it('maps HR zone compact arrays', () => {
        const mapped = mapIntervalsHrZoneTimes([600, 2400, 1800, 900, 300, 0, 0]);
        expect(mapped).toEqual([600, 2400, 1800, 900, 300, 0, 0]);
    });

    it('buildZoneTimesFields adds metadata and FTP snapshot', () => {
        const fields = buildZoneTimesFields({
            icu_zone_times: [{ id: 'Z2', secs: 3600 }],
            icu_ftp: 275,
        });
        expect(fields.power_zone_sec[POWER_ZONE_COUNT - 1]).toBe(0);
        expect(fields.power_zone_sec[1]).toBe(3600);
        expect(fields.zone_times_source).toBe('intervals');
        expect(fields.zone_times_ftp).toBe(275);
    });

    it('protectZoneTimesOnMerge keeps existing zone data when incoming is empty', () => {
        const existing = {
            power_zone_sec: [100, 2000, 0, 0, 0, 0, 0],
            zone_times_source: 'intervals',
            zone_times_ftp: 250,
            hr_zone_sec: [50, 100, 0, 0, 0, 0, 0],
        };
        const out = { id: '1', avg_power: 180 };
        protectZoneTimesOnMerge({ id: '1', avg_power: 180 }, existing, out);
        expect(out.power_zone_sec).toEqual(existing.power_zone_sec);
        expect(out.zone_times_source).toBe('intervals');
        expect(out.zone_times_ftp).toBe(250);
        expect(out.hr_zone_sec).toEqual(existing.hr_zone_sec);
    });

    it('does not overwrite incoming zone data when present', () => {
        const existing = {
            power_zone_sec: [100, 2000, 0, 0, 0, 0, 0],
            zone_times_source: 'intervals',
        };
        const incoming = {
            power_zone_sec: [0, 5000, 0, 0, 0, 0, 0],
            zone_times_source: 'intervals',
        };
        const out = { ...incoming };
        protectZoneTimesOnMerge(incoming, existing, out);
        expect(out.power_zone_sec[1]).toBe(5000);
    });

    it('aggregates zone seconds and builds weekly chart rows', () => {
        const activities = [
            { date: '2026-08-04', power_zone_sec: [0, 3600, 0, 0, 0, 0, 0] },
            { date: '2026-08-06', power_zone_sec: [600, 1800, 0, 0, 0, 0, 0] },
        ];
        expect(hasZoneTimesData(sumPowerZoneSeconds(activities))).toBe(true);
        const totals = sumPowerZoneSeconds(activities);
        expect(totals[0]).toBe(600);
        expect(totals[1]).toBe(5400);

        const rows = weeklyPowerZoneChartRows(activities);
        expect(rows.length).toBe(1);
        expect(rows[0].z2).toBe(1.5);
        expect(rows[0].totalHours).toBeGreaterThan(0);
    });

    it('builds monthly and yearly chart rows', () => {
        const activities = [
            { date: '2026-01-15', power_zone_sec: [0, 3600, 0, 0, 0, 0, 0] },
            { date: '2026-02-10', power_zone_sec: [0, 1800, 0, 0, 0, 0, 0] },
            { date: '2025-12-20', power_zone_sec: [0, 7200, 0, 0, 0, 0, 0] },
        ];

        const monthly = monthlyPowerZoneChartRows(activities);
        expect(monthly).toHaveLength(3);
        expect(monthly[0].bucketKey).toBe('2025-12');
        expect(monthly[1].z2).toBe(1);

        const yearly = yearlyPowerZoneChartRows(activities);
        expect(yearly).toHaveLength(2);
        expect(yearly.find((r) => r.bucketKey === '2026')?.z2).toBe(1.5);
    });

    it('converts chart rows to percentage share per bucket', () => {
        const rows = powerZoneChartRows(
            [{ date: '2026-08-04', power_zone_sec: [3600, 3600, 0, 0, 0, 0, 0] }],
            '2026-08-01',
            '2026-08-31',
            'week',
        );
        const pctRows = powerZoneChartRowsAsPercent(rows);
        expect(pctRows[0].z1).toBe(50);
        expect(pctRows[0].z2).toBe(50);
        expect(pctRows[0].totalPercent).toBe(100);
    });

    it('computes lookback YMD bounds for presets', () => {
        const bounds = computeZoneChartLookbackYmd('4w', { referenceEndYmd: '2026-08-24' });
        expect(bounds.endYmd).toBe('2026-08-24');
        expect(bounds.startYmd).toBe('2026-07-28');

        const dash = computeZoneChartLookbackYmd('dashboard', {
            dashboardStartYmd: '2026-01-01',
            dashboardEndYmd: '2026-08-24',
        });
        expect(dash.startYmd).toBe('2026-01-01');
        expect(dash.endYmd).toBe('2026-08-24');

        const custom = computeZoneChartLookbackYmd('custom', {
            customStartYmd: '2026-03-01',
            customEndYmd: '2026-06-30',
        });
        expect(custom.startYmd).toBe('2026-03-01');
        expect(custom.endYmd).toBe('2026-06-30');

        const customFallback = computeZoneChartLookbackYmd('custom', {
            dashboardStartYmd: '2026-02-01',
            dashboardEndYmd: '2026-08-24',
        });
        expect(customFallback.startYmd).toBe('2026-02-01');
        expect(customFallback.endYmd).toBe('2026-08-24');
    });
});
