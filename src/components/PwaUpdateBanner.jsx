import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

function listenForWaitingWorker(registration, onUpdate) {
    if (registration.waiting) {
        onUpdate(registration);
        return;
    }
    registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                onUpdate(registration);
            }
        });
    });
}

/**
 * Prompts when a new service worker build is available (GitHub Pages / PWA).
 * Reload only after the user chooses "Reload now" — never on first SW install.
 */
export default function PwaUpdateBanner() {
    const [registration, setRegistration] = useState(null);
    const [visible, setVisible] = useState(false);
    const userRequestedReloadRef = useRef(false);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return undefined;

        let active = true;

        const onUpdate = (reg) => {
            if (!active) return;
            setRegistration(reg);
            setVisible(true);
        };

        navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg || !active) return;
            listenForWaitingWorker(reg, onUpdate);
        });

        const onControllerChange = () => {
            if (!userRequestedReloadRef.current) return;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        return () => {
            active = false;
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, []);

    const dismiss = useCallback(() => setVisible(false), []);

    const reload = useCallback(() => {
        const waiting = registration?.waiting;
        userRequestedReloadRef.current = true;
        setVisible(false);
        if (waiting) {
            waiting.postMessage({ type: 'SKIP_WAITING' });
            return;
        }
        window.location.reload();
    }, [registration]);

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[200] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <div className="mx-auto max-w-lg pointer-events-auto rounded-xl border border-cdaccent/40 bg-cdsurface shadow-2xl px-4 py-3 flex items-start gap-3">
                <RefreshCw size={18} className="text-cdaccent shrink-0 mt-0.5" aria-hidden />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cdtext">Update available</p>
                    <p className="text-xs text-cdmuted mt-0.5">
                        A new version of Climb Lab Pro is ready. Reload to get the latest improvements.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <button
                            type="button"
                            onClick={reload}
                            className="px-3 py-1.5 rounded-lg bg-cdaccent text-cdtext text-xs font-bold cd-transition hover:opacity-90 cd-focus-ring"
                        >
                            Reload now
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="px-3 py-1.5 rounded-lg border border-cdborder text-cdmuted text-xs font-bold cd-transition hover:text-cdtext cd-focus-ring"
                        >
                            Later
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="text-cdmuted hover:text-cdtext p-1 rounded cd-focus-ring shrink-0"
                    aria-label="Dismiss update notice"
                >
                    <X size={16} aria-hidden />
                </button>
            </div>
        </div>
    );
}
