import { describe, it, expect } from 'vitest';
import {
    estimateProfileFtpFromActivities,
    estimateProfileFtp60FromActivities,
    resolveEffectiveProfileFtp,
    z2PowerBandFromFtp,
    FTP_SOURCE_ESTIMATED,
    FTP_SOURCE_ESTIMATED_20,
    FTP_SOURCE_ESTIMATED_60,
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

    it('estimateProfileFtp60FromActivities uses best 60m as FTP', () => {
        const est = estimateProfileFtp60FromActivities([
            { id: 'a1', date: '2026-07-01', best_60min: 270 },
            { id: 'a2', date: '2026-01-01', best_60min: 250 },
        ], new Date('2026-08-01'));
        expect(est.ftp).toBe(270);
        expect(est.confidence).toBe('high');
    });

    it('resolveEffectiveProfileFtp prefers 20m estimate when source is estimated_20', () => {
        const resolved = resolveEffectiveProfileFtp(
            { ftp: 250, ftpSource: FTP_SOURCE_ESTIMATED_20 },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300, best_60min: 280 }],
            new Date('2026-08-01'),
        );
        expect(resolved.ftp).toBe(285);
        expect(resolved.source).toBe(FTP_SOURCE_ESTIMATED_20);
    });

    it('resolveEffectiveProfileFtp maps legacy estimated to 20m source', () => {
        const resolved = resolveEffectiveProfileFtp(
            { ftp: 250, ftpSource: FTP_SOURCE_ESTIMATED },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300 }],
            new Date('2026-08-01'),
        );
        expect(resolved.ftp).toBe(285);
        expect(resolved.source).toBe(FTP_SOURCE_ESTIMATED_20);
    });

    it('resolveEffectiveProfileFtp prefers 60m estimate when source is estimated_60', () => {
        const resolved = resolveEffectiveProfileFtp(
            { ftp: 250, ftpSource: FTP_SOURCE_ESTIMATED_60 },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300, best_60min: 265 }],
            new Date('2026-08-01'),
        );
        expect(resolved.ftp).toBe(265);
        expect(resolved.source).toBe(FTP_SOURCE_ESTIMATED_60);
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
