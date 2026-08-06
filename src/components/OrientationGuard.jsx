import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';
import useOrientationPolicy from '../hooks/useOrientationPolicy';

const COPY = {
    portrait: {
        icon: Smartphone,
        title: 'Rotate to portrait',
        body: 'Climb Lab Pro works best on your phone in upright (portrait) mode. You can keep using the app, but some layouts may feel cramped.',
    },
    landscape: {
        icon: Monitor,
        title: 'Use landscape layout',
        body: 'On desktop, widen your browser window or rotate your screen so it is wider than it is tall for the best layout.',
    },
};

function readDismissed(mismatch) {
    if (!mismatch || typeof sessionStorage === 'undefined') return false;
    try {
        return sessionStorage.getItem(`cpl.orientation.dismiss.${mismatch}`) === '1';
    } catch {
        return false;
    }
}

/**
 * Non-blocking orientation hint — dismissible banner instead of a full-screen block.
 */
export default function OrientationGuard() {
    const { mismatch } = useOrientationPolicy();
    const [dismissed, setDismissed] = useState(() => readDismissed(mismatch));

    useEffect(() => {
        setDismissed(readDismissed(mismatch));
    }, [mismatch]);

    if (!mismatch || dismissed) return null;

    const content = COPY[mismatch];
    const Icon = content.icon;

    const handleDismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(`cpl.orientation.dismiss.${mismatch}`, '1');
        } catch {
            /* ignore */
        }
    };

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[500] border-b border-cdborder bg-cdsurface/95 backdrop-blur-sm px-4 py-3 shadow-md"
            role="status"
            aria-live="polite"
        >
            <div className="mx-auto max-w-7xl flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cdborder bg-cdsurfacehigh text-cdaccent">
                    <Icon size={20} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                    <p id="orientation-guard-title" className="text-sm font-bold text-cdtext">
                        {content.title}
                    </p>
                    <p id="orientation-guard-desc" className="text-xs text-cdmuted leading-relaxed mt-0.5">
                        {content.body}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="shrink-0 rounded-lg p-2 text-cdmuted hover:text-cdtext hover:bg-cdsurfacehigh cd-transition cd-focus-ring"
                    aria-label="Dismiss orientation hint"
                >
                    <X size={18} aria-hidden />
                </button>
            </div>
        </div>
    );
}
