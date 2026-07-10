import { lazy } from 'react';
import { isChunkLoadError, performSilentDeployRecovery, hasRecoveryBeenAttempted } from './deployRecovery.js';

/**
 * Wraps React.lazy() with a single automatic retry for stale chunk failures.
 * If the dynamic import still fails and recovery has not run yet, triggers
 * silent cache-bust reload (same mechanism as ErrorBoundary).
 *
 * @param {() => Promise<{ default: React.ComponentType<unknown> }>} importFn
 * @param {string} [label] diagnostic label for logs
 */
export function lazyWithRetry(importFn, label = 'chunk') {
    return lazy(async () => {
        try {
            return await importFn();
        } catch (error) {
            if (isChunkLoadError(error) && !hasRecoveryBeenAttempted()) {
                console.warn(`[lazyWithRetry] ${label} import failed — triggering deploy recovery`, error);
                await performSilentDeployRecovery();
            }
            throw error;
        }
    });
}
