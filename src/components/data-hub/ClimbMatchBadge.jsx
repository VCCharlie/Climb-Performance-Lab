import React from 'react';
import { Route } from 'lucide-react';

/**
 * Inline label when an activity title matches a climb in CLIMB_DATABASE.
 */
const ClimbMatchBadge = ({ climb, onOpenProfiler, activity, compact = false }) => {
    if (!climb?.name) return null;

    const label = `Similar to ${climb.name}`;

    if (typeof onOpenProfiler === 'function' && activity) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfiler(activity, climb);
                }}
                className={`inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cd-transition cd-focus-ring ${
                    compact ? 'text-[9px] px-1 py-0.5 mt-0.5' : 'text-[10px] px-1.5 py-0.5 mt-1'
                }`}
                title={`Open ${climb.name} in Climb Profiler`}
            >
                <Route size={compact ? 10 : 11} aria-hidden />
                <span className="truncate max-w-[14rem]">{label}</span>
            </button>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 text-emerald-400 ${
                compact ? 'text-[9px] px-1 py-0.5 mt-0.5' : 'text-[10px] px-1.5 py-0.5 mt-1'
            }`}
            title={label}
        >
            <Route size={compact ? 10 : 11} aria-hidden />
            <span className="truncate max-w-[14rem]">{label}</span>
        </span>
    );
};

export default ClimbMatchBadge;
