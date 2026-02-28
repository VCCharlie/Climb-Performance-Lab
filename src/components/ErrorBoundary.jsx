import React from 'react';

/**
 * ErrorBoundary vangt alle uncaught render-fouten op en toont een leesbare
 * foutmelding in plaats van een volledig leeg scherm.
 * In React 19 worden render-fouten standaard opnieuw gegooid naar de browser,
 * waardoor de pagina blanco blijft zonder ErrorBoundary.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Render crash:', error, info);
        this.setState({ info });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f2f5',
                    fontFamily: 'Barlow, sans-serif',
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '640px',
                        width: '100%',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
                    }}>
                        <h1 style={{ color: '#dc2626', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            ⚠️ Applicatie kon niet laden
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Er is een onverwachte fout opgetreden tijdens het renderen. Zie hieronder voor details.
                        </p>

                        <details open style={{ marginBottom: '1rem' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1e2330', marginBottom: '0.5rem' }}>
                                Foutmelding
                            </summary>
                            <pre style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '0.75rem',
                                fontSize: '0.75rem',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                color: '#dc2626'
                            }}>
                                {this.state.error?.toString()}
                            </pre>
                        </details>

                        {this.state.info?.componentStack && (
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
                                    color: '#475569'
                                }}>
                                    {this.state.info.componentStack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: '#f97316',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Pagina herladen
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
