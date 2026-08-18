import React from 'react';
import { Cloud, MapPin, Route } from 'lucide-react';
import FlagIcon from '../FlagIcon';
import { climbsByStatus } from '../../utils/bucketListState';
import { canResolveWeatherForClimb } from '../../utils/weatherClimbLocations';

/**
 * Planned climbs with quick link to Weather tab.
 */
const PlannedClimbWeatherPanel = ({
    bucketState,
    climbs,
    onOpenWeatherForClimb,
    onOpenProfilerForClimb,
    onOpenMapTab,
}) => {
    const planned = climbsByStatus(bucketState, climbs, 'planned');

    if (planned.length === 0) return null;

    return (
        <section className="bg-cdsurface border border-cdborder rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-cdtext flex items-center gap-2">
                    <Cloud className="text-cdaccent shrink-0" size={16} aria-hidden />
                    Planned climbs ({planned.length})
                </h3>
                {typeof onOpenMapTab === 'function' && (
                    <button
                        type="button"
                        onClick={onOpenMapTab}
                        className="text-xs font-semibold text-cdaccent hover:underline inline-flex items-center gap-1"
                    >
                        <MapPin size={12} aria-hidden />
                        Open climb map
                    </button>
                )}
            </div>
            <ul className="space-y-2">
                {planned.slice(0, 8).map((climb) => {
                    const hasWeatherHint = canResolveWeatherForClimb(climb);
                    return (
                        <li
                            key={climb.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cdborder/60 bg-cdbg/40 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-cdtext truncate flex items-center gap-1.5">
                                    <FlagIcon country={climb.country} size="sm" />
                                    {climb.name}
                                </p>
                                <p className="text-[10px] text-cdmuted">
                                    {climb.lengthKm} km · {climb.elevation} m · {climb.avgGrade}%
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {typeof onOpenProfilerForClimb === 'function' && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenProfilerForClimb(climb)}
                                        className="text-xs font-bold px-2.5 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent cd-transition"
                                        title="Open in Climb Profiler"
                                    >
                                        <Route size={12} className="inline mr-1" aria-hidden />
                                        Profiler
                                    </button>
                                )}
                                {typeof onOpenWeatherForClimb === 'function' && (
                                <button
                                    type="button"
                                    disabled={!hasWeatherHint}
                                    onClick={() => onOpenWeatherForClimb(climb)}
                                    className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-md border border-cdborder bg-cdsurface text-cdtext hover:border-cdaccent hover:text-cdaccent disabled:opacity-40 disabled:cursor-not-allowed cd-transition"
                                    title={hasWeatherHint ? 'Open in Weather tab' : 'No weather lookup for this virtual climb'}
                                >
                                    Check weather
                                </button>
                            )}
                            </div>
                        </li>
                    );
                })}
            </ul>
            {planned.length > 8 && (
                <p className="text-[10px] text-cdmuted">
                    Showing 8 of {planned.length} planned climbs. Use the filter below to see all.
                </p>
            )}
        </section>
    );
};

export default PlannedClimbWeatherPanel;
