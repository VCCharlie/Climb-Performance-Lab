import React from 'react';
import { pruneLocalStorageCaches, isQuotaExceededError } from '../utils/safeStorage.js';
import { clearSensitiveLocalStorage } from '../utils/sessionData.js';
import {
    isRecoverableDeployError,
    performSilentDeployRecovery,
    hasRecoveryBeenAttempted,
    clearDeployCaches,
} from '../utils/deployRecovery.js';

const IS_PROD = import.meta.env.PROD;

async function clearSiteCacheAndReload() {
    await clearDeployCaches();
    window.location.reload();
}

/**
 * Minimal fallback shown while the boundary triggers a one-shot silent recovery.
 */
function RecoveringFallback() {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f2f5',
                fontFamily: 'Barlow, sans-serif',
                color: '#64748b',
                fontSize: '0.875rem',
            }}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            Updating application…
        </div>
    );
}

/**
 * Global error boundary with self-healing deploy recovery.
 *
 * Recoverable errors (stale chunks, deploy ReferenceErrors) trigger an automatic,
 * invisible cache-bust reload once per tab. Users only see the crash UI if recovery
 * already ran or the error is not deployment-related.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            info: null,
            isRecovering: false,
        };
        this.recoveryStarted = false;
    }

    static getDerivedStateFromError(error) {
        if (isRecoverableDeployError(error) && !hasRecoveryBeenAttempted()) {
            return { hasError: false, error, isRecovering: true };
        }
        return { hasError: true, error, isRecovering: false };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Render crash:', error, info);

        if (isRecoverableDeployError(error) && !hasRecoveryBeenAttempted()) {
            this.setState({ info, isRecovering: true, hasError: false });
            this.triggerSilentRecovery(error);
            return;
        }

        this.setState({ info, hasError: true, isRecovering: false });
    }

    triggerSilentRecovery(error) {
        if (this.recoveryStarted) return;
        this.recoveryStarted = true;

        console.warn('[ErrorBoundary] Recoverable deploy error — starting silent recovery:', error);
        void performSilentDeployRecovery().then(({ reloaded }) => {
            if (!reloaded) {
                this.setState({ hasError: true, isRecovering: false, error });
            }
        });
    }

    render() {
        if (this.state.isRecovering) {
            return <RecoveringFallback />;
        }

        if (this.state.hasError) {
            const quotaError = isQuotaExceededError(this.state.error);
            const recoveryAlreadyTried = hasRecoveryBeenAttempted();

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f2f5',
                    fontFamily: 'Barlow, sans-serif',
                    padding: '2rem',
                }}
                >
                    <div style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '640px',
                        width: '100%',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                    }}
                    >
                        <h1 style={{ color: '#dc2626', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Application could not load
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            {quotaError
                                ? 'Browser storage is full (local cache). Use “Clear cache and reload” below — your activities stay in the cloud after sign-in.'
                                : recoveryAlreadyTried
                                    ? 'An update recovery was already attempted. Try clearing cached app data, or wait a moment and reload again.'
                                    : IS_PROD
                                        ? 'An unexpected error occurred. Try reloading, or clear cached app data if this started after an update.'
                                        : 'An unexpected error occurred while rendering. See details below.'}
                        </p>

                        <details open={!IS_PROD} style={{ marginBottom: '1rem' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1e2330', marginBottom: '0.5rem' }}>
                                Error message
                            </summary>
                            <pre style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '0.75rem',
                                fontSize: '0.75rem',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                color: '#dc2626',
                            }}
                            >
                                {this.state.error?.toString()}
                            </pre>
                        </details>

                        {!IS_PROD && this.state.info?.componentStack && (
                            <details style={{ marginBottom: '1rem' }}>
                                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1e2330', marginBottom: '0.5rem' }}>
                                    Component stack
                                </summary>
                                <pre style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '0.75rem',
                                    fontSize: '0.7rem',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    color: '#475569',
                                }}
                                >
                                    {this.state.info.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                style={{
                                    background: '#f97316',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Reload page
                            </button>
                            <button
                                type="button"
                                onClick={() => { void clearSiteCacheAndReload(); }}
                                style={{
                                    background: '#fff',
                                    color: '#1e2330',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Clear cache and reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
