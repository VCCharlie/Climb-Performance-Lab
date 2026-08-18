import React from 'react';
import { Check, Clock, Star, Route, Cloud } from 'lucide-react';
import FlagIcon from '../FlagIcon';
import ClimbPbActivityLinks from './ClimbPbActivityLinks';
import {
    formatPbSummary,
    formatPbAttributionDetail,
} from '../../utils/climbPersonalBests';
import { formatPbVenueLabel, resolvePbVenue } from '../../utils/activityVenue';
import { summarizePbVsDbGradient } from '../../utils/bucketPbGradientCompare';
import { WEATHER_CLIMB_LOCATIONS } from '../../utils/weatherClimbLocations';

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
    onOpenProfilerForClimb,
    onOpenWeatherForClimb,
}) => {
    const pbLabel = showPb ? formatPbSummary(pb) : null;
    const pbVenue = showPb ? resolvePbVenue(pb, climb, pbActivity) : null;
    const pbGradient = status === 'done' && showPb
        ? summarizePbVsDbGradient(climb, pb, pbActivity)
        : null;

    const canWeather = climb.country !== 'ZWIFT'
        && (WEATHER_CLIMB_LOCATIONS[climb.id] || climb.lat != null || climb.lon != null);

    return (
        <div
            className={`p-3 rounded border transition-colors ${status === 'done'
                ? 'bg-green-50 border-green-200'
                : status === 'planned'
                    ? 'bg-blue-50 border-blue-200'
                    : status === 'want'
                        ? 'bg-cdprimarycontainer/40 border-cdprimary/30'
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
                            {pbGradient?.summaryLine && (
                                <p className="text-[10px] text-cdtext/90 mt-1 leading-snug">
                                    {pbGradient.summaryLine}
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                    <div className="flex gap-1">
                        {onOpenProfilerForClimb && (
                            <button
                                type="button"
                                onClick={() => onOpenProfilerForClimb(climb)}
                                className="p-1.5 rounded bg-cdborder text-cdmuted hover:bg-cdaccent/20 hover:text-cdaccent cd-transition"
                                title="Open in Climb Profiler"
                            >
                                <Route size={14} />
                            </button>
                        )}
                        {onOpenWeatherForClimb && (
                            <button
                                type="button"
                                disabled={!canWeather}
                                onClick={() => onOpenWeatherForClimb(climb)}
                                className="p-1.5 rounded bg-cdborder text-cdmuted hover:bg-cyan-500/20 hover:text-cyan-400 disabled:opacity-35 disabled:cursor-not-allowed cd-transition"
                                title={canWeather ? 'Open in Weather tab' : 'No weather lookup for this climb'}
                            >
                                <Cloud size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1">
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
                            ? 'bg-cdprimary text-cdonprimary'
                            : 'bg-cdborder text-cdmuted hover:bg-cdprimarycontainer hover:text-cdprimary'
                        }`}
                        title="Want to do"
                    >
                        <Star size={14} />
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BucketListClimbRow;
