import { describe, it, expect } from 'vitest';
import {
    estimateProfileFtpFromActivities,
    estimateProfileFtp60FromActivities,
    resolveEffectiveProfileFtp,
    z2PowerBandFromFtp,
    FTP_SOURCE_ESTIMATED,
    FTP_SOURCE_ESTIMATED_20,
    FTP_SOURCE_ESTIMATED_60,
    FTP_LOOKBACK_6_MONTHS,
    FTP_LOOKBACK_RECENT,
    FTP_ESTIMATE_LOOKBACK_DAYS_RECENT,
} from '../../utils/profileFtp';

describe('profileFtp', () => {
    it('z2PowerBandFromFtp returns watt range for 55–75%', () => {
        const band = z2PowerBandFromFtp(280);
        expect(band).toEqual({ minW: 154, maxW: 210, minPct: 55, maxPct: 75 });
    });

    it('estimateProfileFtpFromActivities uses best 20m × 0.95 within lookback window', () => {
        const est = estimateProfileFtpFromActivities([
            { id: 'a1', date: '2026-07-01', best_20min: 300 },
            { id: 'a2', date: '2026-01-01', best_20min: 250 },
        ], new Date('2026-08-01'));
        expect(est.ftp).toBe(285);
        expect(est.confidence).toBe('high');
    });

    it('estimateProfileFtpFromActivities ignores all-time peaks older than 6 months', () => {
        const est = estimateProfileFtpFromActivities([
            { id: 'old', date: '2016-05-01', best_20min: 400 },
            { id: 'recent', date: '2026-06-15', best_20min: 260 },
        ], new Date('2026-08-01'));
        expect(est.ftp).toBe(247);
        expect(est.activity?.id).toBe('recent');
    });

    it('estimateProfileFtpFromActivities uses 90-day window when recent lookback selected', () => {
        const ref = new Date('2026-08-01');
        const est = estimateProfileFtpFromActivities(
            [
                { id: 'old-window', date: '2026-04-01', best_20min: 300 },
                { id: 'fresh', date: '2026-07-10', best_20min: 260 },
            ],
            ref,
            { ftpLookbackWindow: FTP_LOOKBACK_RECENT },
        );
        expect(est.ftp).toBe(247);
        expect(est.activity?.id).toBe('fresh');
        expect(est.lookbackDays).toBe(FTP_ESTIMATE_LOOKBACK_DAYS_RECENT);
    });

    it('estimateProfileFtp60FromActivities ignores all-time peaks older than 6 months', () => {
        const est = estimateProfileFtp60FromActivities([
            { id: 'old', date: '2016-05-01', best_60min: 380 },
            { id: 'recent', date: '2026-06-15', best_60min: 255 },
        ], new Date('2026-08-01'));
        expect(est.ftp).toBe(255);
        expect(est.activity?.id).toBe('recent');
    });

    it('estimateProfileFtp60FromActivities uses 90-day window when recent lookback selected', () => {
        const est = estimateProfileFtp60FromActivities(
            [
                { id: 'old-window', date: '2026-04-01', best_60min: 280 },
                { id: 'fresh', date: '2026-07-10', best_60min: 255 },
            ],
            new Date('2026-08-01'),
            { ftpLookbackWindow: FTP_LOOKBACK_RECENT },
        );
        expect(est.ftp).toBe(255);
        expect(est.activity?.id).toBe('fresh');
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
            { ftp: 250, ftpSource: 'manual', ftpLookbackWindow: FTP_LOOKBACK_6_MONTHS },
            [{ id: 'a1', date: '2026-07-01', best_20min: 300 }],
        );
        expect(resolved.ftp).toBe(250);
        expect(resolved.source).toBe('manual');
    });
});
