import { describe, it, expect } from 'vitest';
import { scanClimbPersonalBests, scanClimbPersonalBestsAsync, formatPbSummary, hasStoredClimbPb, countClimbsWithPb, summarizePbScanResult, formatPbScanFeedbackMessage, formatPbAttributionDetail, pruneMismatchedVenuePbs, replaceClimbPbsFromScan, pruneInvalidPbAttributions } from '../../utils/climbPersonalBests';

const climbs = [
    { id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR' },
    { id: 'it_stelvio', name: 'Passo dello Stelvio', country: 'IT' },
    { id: 'fr_platzerwasel', name: 'Col du Platzerwasel', country: 'FR' },
    { id: 'zp_platzer', name: 'Col du Platzerwasel', country: 'ZWIFT' },
];

describe('scanClimbPersonalBests', () => {
    it('matches activities by title and keeps best NP', () => {
        const pbs = scanClimbPersonalBests(
            [
                { id: '1', title: 'Morning Alpe d Huez', norm_power: 250, date: '2026-01-01', moving_time: 3600, strava_id: 'strava-1' },
                { id: '2', title: 'Alpe d Huez PR attempt', norm_power: 265, date: '2026-02-01', moving_time: 3500, strava_id: 'strava-2' },
            ],
            climbs,
        );

        expect(pbs.fr_alpe?.normPower).toBe(265);
        expect(pbs.fr_alpe?.activityId).toBe('2');
        expect(pbs.fr_alpe?.stravaId).toBe('strava-2');
    });

    it('matches activities by description when title is generic', () => {
        const pbs = scanClimbPersonalBests(
            [
                {
                    id: '3',
                    title: 'Sunday ride',
                    description: 'MyCols: Passo dello Stelvio from Prato',
                    norm_power: 240,
                    date: '2026-03-01',
                    moving_time: 4000,
                },
            ],
            climbs,
        );

        expect(pbs.it_stelvio?.normPower).toBe(240);
        expect(pbs.it_stelvio?.matchSource).toBe('description');
    });

    it('scanClimbPersonalBestsAsync matches sync scan results', async () => {
        const activities = [
            { id: '1', title: 'Morning Alpe d Huez', norm_power: 250, date: '2026-01-01', moving_time: 3600 },
            { id: '2', title: 'Alpe d Huez PR attempt', norm_power: 265, date: '2026-02-01', moving_time: 3500 },
            {
                id: '3',
                title: 'Sunday ride',
                description: 'MyCols: Passo dello Stelvio from Prato',
                norm_power: 240,
                date: '2026-03-01',
                moving_time: 4000,
            },
        ];

        const sync = scanClimbPersonalBests(activities, climbs);
        const progress = [];
        const asyncResult = await scanClimbPersonalBestsAsync(activities, climbs, {
            chunkSize: 1,
            onProgress: (p) => progress.push(p),
        });

        expect(asyncResult).toEqual(sync);
        expect(progress.length).toBeGreaterThan(0);
        expect(progress[progress.length - 1]).toEqual({ done: activities.length, total: activities.length });
    });

    it('formatPbSummary combines power and time', () => {
        const label = formatPbSummary({ normPower: 260, movingTimeSec: 2700 });
        expect(label).toContain('260');
        expect(label).toContain('45 min');
    });

    it('hasStoredClimbPb and countClimbsWithPb', () => {
        const pbs = {
            fr_alpe: { normPower: 250, venue: 'outdoor' },
            empty: {},
        };
        expect(hasStoredClimbPb(pbs, 'fr_alpe', { country: 'FR' }, 'outdoor')).toBe(true);
        expect(hasStoredClimbPb(pbs, 'empty')).toBe(false);
        expect(countClimbsWithPb(pbs, [{ id: 'fr_alpe', country: 'FR' }], 'outdoor')).toBe(1);
    });

    it('stores separate outdoor and Zwift PBs for similarly named climbs', () => {
        const pbs = scanClimbPersonalBests(
            [
                { id: 'z1', type: 'VirtualRide', title: 'Zwift: Col du Platzerwasel', norm_power: 300, moving_time: 2000 },
                { id: 'o1', type: 'Ride', title: 'Col du Platzerwasel', norm_power: 260, moving_time: 2800 },
            ],
            climbs,
        );

        expect(pbs.zp_platzer?.normPower).toBe(300);
        expect(pbs.zp_platzer?.venue).toBe('virtual');
        expect(pbs.fr_platzerwasel?.normPower).toBe(260);
        expect(pbs.fr_platzerwasel?.venue).toBe('outdoor');
    });

    it('pruneMismatchedVenuePbs removes Zwift PB rows from real climbs', () => {
        const pruned = pruneMismatchedVenuePbs(
            {
                fr_platzerwasel: { normPower: 300, venue: 'virtual', activityId: 'z1' },
                zp_platzer: { normPower: 300, venue: 'virtual', activityId: 'z1' },
            },
            climbs,
            [{ id: 'z1', type: 'VirtualRide', title: 'Rouvy Platzerwasel' }],
        );
        expect(pruned.fr_platzerwasel).toBeUndefined();
        expect(pruned.zp_platzer?.normPower).toBe(300);
    });

    it('does not match PB from Similar to description hints', () => {
        const pbs = scanClimbPersonalBests(
            [{
                id: 'bad',
                type: 'Ride',
                title: 'Profile title',
                description: 'Similar to Passo dello Stelvio',
                norm_power: 240,
                moving_time: 3600,
            }],
            climbs,
        );
        expect(pbs.it_stelvio).toBeUndefined();
    });

    it('does not match PB from loose title word overlap', () => {
        const pbs = scanClimbPersonalBests(
            [{
                id: 'loose',
                type: 'Ride',
                title: 'Easy ride near Stelvio',
                norm_power: 240,
                moving_time: 3600,
            }],
            climbs,
        );
        expect(pbs.it_stelvio).toBeUndefined();
    });

    it('replaceClimbPbsFromScan drops stale PB rows from a previous scan', () => {
        const scanned = {
            fr_alpe: { normPower: 265, movingTimeSec: 3500, matchSource: 'title' },
        };

        const replaced = replaceClimbPbsFromScan(scanned, climbs);
        expect(replaced.fr_alpe?.normPower).toBe(265);
        expect(replaced.it_stelvio).toBeUndefined();
    });

    it('scanning with Zwift-only climbs then replace drops outdoor PBs (full DB required)', () => {
        const prev = {
            fr_alpe: { normPower: 280, movingTimeSec: 3300, date: '2026-04-01', title: "Alpe d'Huez", activityId: 'out-1' },
            zp_platzer: { normPower: 220, movingTimeSec: 2000, date: '2026-04-02', title: 'Platzer', activityId: 'zw-1' },
        };
        const zwiftOnlyClimbs = climbs.filter((c) => c.country === 'ZWIFT');
        const scanned = scanClimbPersonalBests(
            [
                {
                    id: 'out-1',
                    title: "Alpe d'Huez",
                    norm_power: 280,
                    date: '2026-04-01',
                    moving_time: 3300,
                    type: 'Ride',
                },
                {
                    id: 'zw-1',
                    title: 'Col du Platzerwasel',
                    norm_power: 220,
                    date: '2026-04-02',
                    moving_time: 2000,
                    type: 'VirtualRide',
                },
            ],
            zwiftOnlyClimbs,
        );
        const replaced = replaceClimbPbsFromScan(scanned, zwiftOnlyClimbs);
        expect(replaced.fr_alpe).toBeUndefined();
        expect(Object.keys(replaced).length).toBeLessThan(Object.keys(prev).length);
    });

    it('formatPbAttributionDetail combines match source, venue, and ride title', () => {
        const climb = { id: 'fr_alpe', name: 'Alpe d\'Huez', country: 'FR' };
        const pb = {
            matchSource: 'description',
            activityTitle: 'Sunday climb',
            venue: 'outdoor',
        };
        const detail = formatPbAttributionDetail(pb, climb, null);
        expect(detail).toContain('description');
        expect(detail).toContain('Sunday climb');
    });

    it('summarizePbScanResult reports no change when scan matches same climbs', () => {
        const prev = {
            fr_alpe: { normPower: 265, movingTimeSec: 3500 },
        };
        const scanned = {
            fr_alpe: { normPower: 265, movingTimeSec: 3500, matchSource: 'title' },
        };
        const activities = [{ title: 'Alpe d Huez', norm_power: 265, moving_time: 3500 }];

        const summary = summarizePbScanResult(prev, scanned, activities);
        expect(summary.totalWithPb).toBe(1);
        expect(summary.newClimbs).toBe(0);
        expect(summary.improvedPbs).toBe(0);
        expect(summary.removedPbs).toBe(0);
        expect(formatPbScanFeedbackMessage(summary)).toContain('no changes');
    });

    it('summarizePbScanResult counts removed stale PBs', () => {
        const summary = summarizePbScanResult(
            { it_stelvio: { normPower: 240, movingTimeSec: 4000 } },
            {},
            [],
            climbs,
        );
        expect(summary.removedPbs).toBe(1);
        expect(summary.totalWithPb).toBe(0);
        expect(formatPbScanFeedbackMessage(summary)).toContain('1 removed');
    });

    it('pruneInvalidPbAttributions drops legacy word-overlap PB rows', () => {
        const climbs = [
            { id: 'nl_amerongse', name: 'Amerongse Berg', country: 'NL' },
        ];
        const activities = [{
            id: 'a1',
            type: 'Ride',
            title: 'Windkracht 5 in je giechel. Dan toch liever een berg...',
            norm_power: 200,
            moving_time: 3600,
        }];
        const pruned = pruneInvalidPbAttributions(
            {
                nl_amerongse: {
                    normPower: 200,
                    movingTimeSec: 3600,
                    activityId: 'a1',
                },
            },
            activities,
            climbs,
        );
        expect(pruned.nl_amerongse).toBeUndefined();
    });

    it('summarizePbScanResult counts new climbs', () => {
        const summary = summarizePbScanResult(
            {},
            { it_stelvio: { normPower: 240, matchSource: 'description' } },
            [{ description: 'Stelvio', norm_power: 240 }],
        );
        expect(summary.newClimbs).toBe(1);
        expect(summary.totalWithPb).toBe(1);
    });
});
