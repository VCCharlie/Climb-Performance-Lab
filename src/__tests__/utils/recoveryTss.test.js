import { describe, it, expect } from 'vitest';
import {
    resolveRecoveryTss,
    buildMarkRecoveryConfirmMessage,
    buildMarkRecoveryTooltip,
} from '../../utils/recoveryTss';

describe('resolveRecoveryTss', () => {
    it('returns configured value when valid', () => {
        expect(resolveRecoveryTss({ recoveryTss: 40 })).toBe(40);
    });

    it('falls back to default when missing or invalid', () => {
        expect(resolveRecoveryTss({})).toBe(35);
        expect(resolveRecoveryTss({ recoveryTss: -5 })).toBe(35);
        expect(resolveRecoveryTss({ recoveryTss: 1500 })).toBe(35);
    });
});

describe('buildMarkRecoveryConfirmMessage', () => {
    it('mentions count and TSS value', () => {
        const msg = buildMarkRecoveryConfirmMessage(2, 42);
        expect(msg).toContain('2 selected activities');
        expect(msg).toContain('TSS) to 42');
        expect(msg).toContain('Settings');
    });

    it('uses singular noun for one activity', () => {
        expect(buildMarkRecoveryConfirmMessage(1, 35)).toContain('1 selected activity');
    });
});

describe('buildMarkRecoveryTooltip', () => {
    it('describes scope and settings location', () => {
        const tip = buildMarkRecoveryTooltip(30);
        expect(tip).toContain('TSS) to 30');
        expect(tip).toContain('confirm');
        expect(tip).toContain('Settings');
    });
});
