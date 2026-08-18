import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildZwoXml, zwoFilenameFromTitle } from '../../utils/zwoExport';

describe('zwoExport', () => {
    it('buildZwoXml includes workout metadata and steps', () => {
        const xml = buildZwoXml({
            title: 'Sweetspot 2×20',
            description: 'Test workout',
            zwoSteps: [
                { type: 'Warmup', duration: 600, powerLow: 0.50, powerHigh: 0.60 },
                { type: 'IntervalsT', repeat: 2, onDuration: 300, offDuration: 120, onPower: 1.0, offPower: 0.5 },
                { type: 'SteadyState', duration: 900, power: 0.65 },
            ],
        });

        expect(xml).toContain('<name>Sweetspot 2×20</name>');
        expect(xml).toContain('<description>Test workout</description>');
        expect(xml).toContain('<Warmup Duration="600"');
        expect(xml).toContain('<IntervalsT Repeat="2"');
        expect(xml).toContain('<SteadyState Duration="900" Power="0.65"/>');
    });

    it('zwoFilenameFromTitle sanitizes spaces and special chars', () => {
        expect(zwoFilenameFromTitle('Climb prep: Alpe')).toBe('CPL_Climb_prep__Alpe.zwo');
    });
});

describe('downloadZwoWorkout', () => {
    beforeEach(() => {
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:mock'),
            revokeObjectURL: vi.fn(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns false when workout has no steps', async () => {
        const { downloadZwoWorkout } = await import('../../utils/zwoExport');
        expect(downloadZwoWorkout({ title: 'Rest', zwoSteps: [] })).toBe(false);
    });
});
