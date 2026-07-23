import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getClimbPbLinkInfo } from '../../utils/climbPbActivityLinks';

/**
 * Short links under a climb PB row: Activity log, Strava, Intervals.icu.
 */
export default function ClimbPbActivityLinks({ pb, activities, onOpenActivityInLog }) {
    const { activityId, externalLinks } = getClimbPbLinkInfo(pb, activities);
    const canOpenLog = activityId && typeof onOpenActivityInLog === 'function';

    if (!canOpenLog && externalLinks.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
            {canOpenLog && (
                <button
                    type="button"
                    onClick={() => onOpenActivityInLog(activityId, { isolate: true })}
                    className="text-[10px] font-bold text-cdaccent hover:underline inline-flex items-center gap-0.5"
                >
                    <ExternalLink size={10} aria-hidden />
                    Log
                </button>
            )}
            {externalLinks.map((link) => (
                <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-cdmuted hover:text-cdaccent"
                >
                    {link.label}
                </a>
            ))}
        </div>
    );
}
