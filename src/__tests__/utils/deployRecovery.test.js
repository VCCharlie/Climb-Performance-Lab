import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    isChunkLoadError,
    isDeployReferenceError,
    isRecoverableDeployError,
    hasRecoveryBeenAttempted,
    markRecoveryAttempted,
    clearRecoveryAttemptFlag,
    readStoredBuildId,
    persistCurrentBuildId,
    STORED_BUILD_ID_KEY,
    RECOVERY_ATTEMPT_KEY,
} from '../../utils/deployRecovery.js';

describe('deployRecovery', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('isChunkLoadError', () => {
        it('detects dynamic import fetch failures', () => {
            const error = new TypeError('Failed to fetch dynamically imported module: https://example.com/chunk.js');
            expect(isChunkLoadError(error)).toBe(true);
        });

        it('detects ChunkLoadError by name', () => {
            const error = new Error('loading chunk 42 failed');
            error.name = 'ChunkLoadError';
            expect(isChunkLoadError(error)).toBe(true);
        });

        it('returns false for unrelated errors', () => {
            expect(isChunkLoadError(new Error('network down'))).toBe(false);
        });
    });

    describe('isDeployReferenceError', () => {
        it('detects undefined component symbols after stale deploys', () => {
            const error = new ReferenceError('OverviewTab is not defined');
            expect(isDeployReferenceError(error)).toBe(true);
        });

        it('ignores non-ReferenceError types', () => {
            expect(isDeployReferenceError(new TypeError('x is not defined'))).toBe(false);
        });
    });

    describe('isRecoverableDeployError', () => {
        it('classifies chunk and deploy reference errors as recoverable', () => {
            expect(isRecoverableDeployError(new ReferenceError('OverviewTab is not defined'))).toBe(true);
            expect(isRecoverableDeployError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
        });

        it('returns false for generic application errors', () => {
            expect(isRecoverableDeployError(new Error('Cannot read properties of null'))).toBe(false);
        });
    });

    describe('recovery attempt guard', () => {
        it('tracks one recovery attempt per tab', () => {
            expect(hasRecoveryBeenAttempted()).toBe(false);
            markRecoveryAttempted();
            expect(hasRecoveryBeenAttempted()).toBe(true);
            expect(sessionStorage.getItem(RECOVERY_ATTEMPT_KEY)).toBe('1');
        });

        it('clears the recovery guard after successful boot or manual cache clear', () => {
            markRecoveryAttempted();
            clearRecoveryAttemptFlag();
            expect(hasRecoveryBeenAttempted()).toBe(false);
            expect(sessionStorage.getItem(RECOVERY_ATTEMPT_KEY)).toBeNull();
        });
    });

    describe('build ID persistence', () => {
        it('stores and reads the active build ID', () => {
            persistCurrentBuildId('v1.2.3-abc');
            expect(readStoredBuildId()).toBe('v1.2.3-abc');
            expect(localStorage.getItem(STORED_BUILD_ID_KEY)).toBe('v1.2.3-abc');
        });
    });
});
