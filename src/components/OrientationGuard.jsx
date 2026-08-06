import React from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import useOrientationPolicy from '../hooks/useOrientationPolicy';

const COPY = {
    portrait: {
        icon: Smartphone,
        title: 'Rotate to portrait',
        body: 'Climb Lab Pro works best on your phone in upright (portrait) mode. Please turn your device.',
    },
    landscape: {
        icon: Monitor,
        title: 'Use landscape layout',
        body: 'On desktop, widen your browser window or rotate your screen so it is wider than it is tall.',
    },
};

/**
 * Blocks interaction when orientation does not match device class (mobile portrait, desktop landscape).
 */
export default function OrientationGuard() {
    const { mismatch } = useOrientationPolicy();

    if (!mismatch) return null;

    const content = COPY[mismatch];
    const Icon = content.icon;

    return (
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-cdbg/95 backdrop-blur-sm p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orientation-guard-title"
            aria-describedby="orientation-guard-desc"
        >
            <div className="max-w-sm text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cdborder bg-cdsurface text-cdaccent">
                    <Icon size={32} aria-hidden />
                </div>
                <div className="space-y-2">
                    <h2 id="orientation-guard-title" className="text-xl font-bold text-cdtext font-head tracking-wide uppercase">
                        {content.title}
                    </h2>
                    <p id="orientation-guard-desc" className="text-sm text-cdmuted leading-relaxed">
                        {content.body}
                    </p>
                </div>
            </div>
        </div>
    );
}
