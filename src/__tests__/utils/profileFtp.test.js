import { describe, it, expect } from 'vitest';
import {
    estimateProfileFtpFromActivities,
    resolveEffectiveProfileFtp,
    z2PowerBandFromFtp,
    FTP_SOURCE_ESTIMATED,
} from '../../utils/profileFtp';

describe('profileFtp', () => {
    it('z2PowerBandFromFtp returns watt range for 55–75%', () => {
        const band = z2PowerBandFromFtp(280);
        expect(band).toEqual({ minW: 154, maxW: 210, minPct: 55, maxPct: 75 });
    });

    it('estimateProfileFtpFromActivities uses best 20m × 0.95', () => {
        const est = estimateProfileFtpFromActivities([
            { id: 'a1', date: '2026-07-01', best_20min: 300 },
            { id: 'a2', date: '2026-01-01', best_20min: 250 },
        ], new Date('2026-08-01'));
        expect(est.ftp).toBe(285);
        expect(est.confidence).toBe('high');
    });

    it('resolveEffectiveProfileFtp prefers estimate when source is estimated', () => {
        const resolved = resolveEffectiveProfileFtp(
            { ftp: 250, ftpSource: FTP_SOURCE_ESTIMATED },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300 }],
            new Date('2026-08-01'),
        );
        expect(resolved.ftp).toBe(285);
        expect(resolved.source).toBe(FTP_SOURCE_ESTIMATED);
    });

    it('resolveEffectiveProfileFtp uses manual when source is manual', () => {
        const resolved = resolveEffectiveProfileFtp(
            { ftp: 250, ftpSource: 'manual' },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300 }],
        );
        expect(resolved.ftp).toBe(250);
        expect(resolved.source).toBe('manual');
    });
});
