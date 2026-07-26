import React from 'react';
import { Check, Clock, Star } from 'lucide-react';
import FlagIcon from '../FlagIcon';
import ClimbPbActivityLinks from './ClimbPbActivityLinks';
import {
    formatPbSummary,
    formatPbAttributionDetail,
} from '../../utils/climbPersonalBests';
import { formatPbVenueLabel, resolvePbVenue } from '../../utils/activityVenue';

/**
 * Single climb row in the bucket list (virtualized parent supplies positioning).
 */
const BucketListClimbRow = ({
    climb,
    status,
    showPb,
    pb,
    pbActivity,
    activities,
    onToggleStatus,
    onRemovePb,
    onOpenActivityInLog,
}) => {
    const pbLabel = showPb ? formatPbSummary(pb) : null;
    const pbVenue = showPb ? resolvePbVenue(pb, climb, pbActivity) : null;

    return (
        <div
            className={`p-3 rounded border transition-colors ${status === 'done'
                ? 'bg-green-50 border-green-200'
                : status === 'planned'
                    ? 'bg-blue-50 border-blue-200'
                    : status === 'want'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-cdsurface border-cdborder hover:border-cdborder'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="text-cdtext font-bold text-sm flex items-center gap-2">
                        <FlagIcon country={climb.country} size="sm" />
                        <span className="truncate">{climb.name}</span>
                        {status === 'done' && <Check className="text-green-500 shrink-0" size={16} />}
                    </h4>
                    <p className="text-cdmuted text-xs mt-1">
                        {climb.lengthKm}km • {climb.elevation}m • {climb.avgGrade}% avg
                    </p>
                    {pbLabel && (
                        <>
                            <p className="text-[10px] text-cdaccent mt-1 font-medium">
                                PB{pbVenue ? ` (${formatPbVenueLabel(pbVenue)})` : ''}: {pbLabel}
                            </p>
                            <p className="text-[10px] text-cdmuted mt-0.5 leading-snug">
                                {formatPbAttributionDetail(pb, climb, pbActivity)}
                            </p>
                            <ClimbPbActivityLinks
                                pb={pb}
                                activities={activities}
                                onOpenActivityInLog={onOpenActivityInLog}
                            />
                            {onRemovePb && (
                                <button
                                    type="button"
                                    onClick={() => onRemovePb(climb.id)}
                                    className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400 hover:underline"
                                >
                                    Remove PB
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="flex gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => onToggleStatus(climb.id, 'done')}
                        className={`p-1.5 rounded transition-colors ${status === 'done'
                            ? 'bg-green-500 text-white'
                            : 'bg-cdborder text-cdmuted hover:bg-green-100 hover:text-green-600'
                        }`}
                        title="Completed"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleStatus(climb.id, 'planned')}
                        className={`p-1.5 rounded transition-colors ${status === 'planned'
                            ? 'bg-blue-500 text-white'
                            : 'bg-cdborder text-cdmuted hover:bg-blue-100 hover:text-blue-600'
                        }`}
                        title="Planned"
                    >
                        <Clock size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleStatus(climb.id, 'want')}
                        className={`p-1.5 rounded transition-colors ${status === 'want'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-cdborder text-cdmuted hover:bg-yellow-100 hover:text-yellow-600'
                        }`}
                        title="Want to do"
                    >
                        <Star size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BucketListClimbRow;
