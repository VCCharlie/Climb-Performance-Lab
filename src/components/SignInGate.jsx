import React from 'react';
import { Cloud, LogIn } from 'lucide-react';
import { Button, Card } from './ui';

/**
 * Shown when the user is signed out — replaces dashboard / activity content.
 */
export default function SignInGate({ onSignIn, authBusy = false, authError = null }) {
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
                    disabled={authBusy}
                >
                    <LogIn size={18} aria-hidden />
                    Sign in with Google
                </Button>
            </Card>
        </div>
    );
}
