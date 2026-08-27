import { describe, it, expect } from 'vitest';
import {
    BACKUP_MAX_BYTES,
    buildBackupExport,
    validateBackupPayload,
    describeBackupImport,
} from '../../utils/backupSchema.js';

describe('backupSchema', () => {
    it('adds security notice on export', () => {
        const out = buildBackupExport({ settings: { ftp: 250 } });
        expect(out._security_notice).toContain('plain text');
        expect(out.settings.ftp).toBe(250);
    });

    it('rejects unknown top-level keys', () => {
        const result = validateBackupPayload({ settings: {}, injected: true });
        expect(result.ok).toBe(false);
    });

    it('accepts known backup shape', () => {
        const result = validateBackupPayload({
            activities: [],
            settings: {},
            intervals: {},
            bucketList: {},
            racePacing: {},
            gearOptimizer: {},
            climbProfiler: {},
            weatherClimb: {},
            fueling: {},
            activityLogFilter: {},
            _security_notice: 'x',
        });
        expect(result.ok).toBe(true);
        expect(result.keys).toContain('racePacing');
    });

    it('describes import sections', () => {
        const lines = describeBackupImport({ activities: [], settings: { ftp: 1 } });
        expect(lines).toContain('Activities');
        expect(lines).toContain('User settings (weight, FTP, goals, …)');
    });

    it('documents max backup size', () => {
        expect(BACKUP_MAX_BYTES).toBe(10 * 1024 * 1024);
    });
});
