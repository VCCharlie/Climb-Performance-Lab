import React, { useState } from 'react';
import { Cloud, LogIn, RefreshCw } from 'lucide-react';
import { Button, Card } from './ui';
import { repairSignInBrowserState } from '../utils/repairSignInState.js';

/**
 * Shown when the user is signed out — replaces dashboard / activity content.
 */
export default function SignInGate({ onSignIn, authBusy = false, authError = null }) {
    const [repairBusy, setRepairBusy] = useState(false);

    const handleRepair = async () => {
        if (repairBusy || authBusy) return;
        const confirmed = window.confirm(
            'Clear cached app data and reset sign-in for this browser?\n\n'
            + 'Your cloud data is safe. This fixes sign-in when incognito works but this browser does not.',
        );
        if (!confirmed) return;
        setRepairBusy(true);
        try {
            await repairSignInBrowserState();
        } catch (err) {
            console.error('[SignInGate] repair failed:', err);
            window.alert('Could not reset browser cache. Try clearing site data manually in browser settings.');
            setRepairBusy(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100dvh-5.5rem)] px-4 py-8">
            <Card variant="outlined" padding="lg" className="max-w-md w-full text-center">
                <Cloud className="w-12 h-12 mx-auto text-cdmuted mb-4" aria-hidden />
                <h2 className="text-xl font-head font-bold text-cdtext mb-2">
                    Sign in to view your data
                </h2>
                <p className="text-cdmuted text-sm mb-6 leading-relaxed">
                    Your activities, training settings, and sync data are tied to your Google account.
                    Sign in to load your dashboard and activity log.
                </p>
                {authError && (
                    <p className="text-sm text-cdred mb-4 leading-relaxed" role="alert">
                        {authError}
                    </p>
                )}
                <Button
                    type="button"
                    fullWidth
                    size="lg"
                    onClick={onSignIn}
                    loading={authBusy}
                    disabled={authBusy || repairBusy}
                >
                    <LogIn size={18} aria-hidden />
                    Sign in with Google
                </Button>
                <button
                    type="button"
                    onClick={handleRepair}
                    disabled={authBusy || repairBusy}
                    className="mt-4 inline-flex items-center justify-center gap-2 text-xs text-cdmuted hover:text-cdtext transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={repairBusy ? 'animate-spin' : ''} aria-hidden />
                    {repairBusy ? 'Resetting browser cache…' : 'Sign-in stuck? Reset browser cache'}
                </button>
            </Card>
        </div>
    );
}
