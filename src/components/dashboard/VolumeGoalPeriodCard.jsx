import React from 'react';
import { getVolumeScheduleStatus } from '../../utils/volumeGoals';
import { projectionVsTargetStatus } from '../../utils/yearEndProjection';
import {
    formatHoursShort,
    PeriodTimeStrip,
    aggregatePaceSummary,
    GoalRow,
} from './volumeGoalsPanelParts';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {{ startYmd: string, endYmd: string }} props.range
 * @param {import('../../utils/volumeGoals').VolumeGoalsShape['weekly']} props.g
 * @param {{ distanceKm: number, movingTimeSec: number, elevationM: number, movingTimeH: number }} props.s
 * @param {Date} props.nowRef
 * @param {{ distanceKm: number, movingTimeHours: number, elevationM: number, elapsedRatio: number } | null} [props.yearEndProjection]
 */
export function VolumeGoalPeriodCard({ title, subtitle, range, g, s, nowRef, yearEndProjection = null }) {
    const summary = aggregatePaceSummary(g, s, range, nowRef);
    const summaryCls =
        summary.tone === 'behind'
            ? 'text-amber-700 dark:text-amber-400'
            : summary.tone === 'ahead'
              ? 'text-emerald-600 dark:text-emerald-400'
              : summary.tone === 'mixed'
                ? 'text-cdaccent'
                : 'text-cdmuted';

    const paceDist = getVolumeScheduleStatus(s.distanceKm, g.distanceKm, range, nowRef);
    const paceTime = getVolumeScheduleStatus(s.movingTimeSec, g.movingTimeHours * 3600, range, nowRef);
    const paceElev = getVolumeScheduleStatus(s.elevationM, g.elevationM, range, nowRef);

    const showProjection = yearEndProjection && yearEndProjection.elapsedRatio >= 0.02;
    const projDistStatus = showProjection ? projectionVsTargetStatus(yearEndProjection.distanceKm, g.distanceKm) : null;
    const projTimeStatus = showProjection ? projectionVsTargetStatus(yearEndProjection.movingTimeHours, g.movingTimeHours) : null;
    const projElevStatus = showProjection ? projectionVsTargetStatus(yearEndProjection.elevationM, g.elevationM) : null;

    const projectionTone = (status) => {
        if (status === 'above') return 'text-emerald-600 dark:text-emerald-400';
        if (status === 'below') return 'text-amber-700 dark:text-amber-400';
        if (status === 'on_track') return 'text-cdtext';
        return 'text-cdmuted';
    };

    return (
        <div className="rounded-lg border border-cdborder/80 bg-cdbg/30 p-3 space-y-3">
            <div>
                <div className="text-xs font-bold text-cdtext">{title}</div>
                <div className="text-[10px] text-cdmuted">{subtitle}</div>
            </div>

            <div>
                <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide mb-1">Period time</div>
                <PeriodTimeStrip range={range} nowRef={nowRef} />
                <p className={`text-[10px] mt-2 leading-snug ${summaryCls}`}>{summary.text}</p>
            </div>

            <div className="space-y-3">
                <GoalRow
                    label="Distance"
                    current={s.distanceKm}
                    target={g.distanceKm}
                    unit="km"
                    formatCurrent={(v) => (Math.round(v * 10) / 10).toFixed(1)}
                    formatTarget={(v) => String(Math.round(v * 10) / 10)}
                    paceStatus={paceDist}
                />
                <GoalRow
                    label="Moving time"
                    current={s.movingTimeH}
                    target={g.movingTimeHours}
                    unit="h"
                    formatCurrent={formatHoursShort}
                    formatTarget={(v) => formatHoursShort(v)}
                    paceStatus={paceTime}
                />
                <GoalRow
                    label="Elevation"
                    current={s.elevationM}
                    target={g.elevationM}
                    unit="m"
                    formatCurrent={(v) => String(Math.round(v))}
                    formatTarget={(v) => String(Math.round(v))}
                    paceStatus={paceElev}
                />
            </div>

            {showProjection && (g.distanceKm > 0 || g.movingTimeHours > 0 || g.elevationM > 0) ? (
                <div className="pt-2 border-t border-cdborder/50 space-y-2">
                    <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Year-end projection</div>
                    <p className="text-[10px] text-cdmuted leading-snug">
                        Linear pace from YTD through today — if you keep this rate until 31 Dec.
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                        {g.distanceKm > 0 ? (
                            <p className={projectionTone(projDistStatus)}>
                                <span className="text-cdmuted font-medium">Distance:</span>{' '}
                                ~{(Math.round(yearEndProjection.distanceKm * 10) / 10).toFixed(1)} km
                                <span className="text-cdmuted"> (goal {g.distanceKm} km)</span>
                            </p>
                        ) : null}
                        {g.movingTimeHours > 0 ? (
                            <p className={projectionTone(projTimeStatus)}>
                                <span className="text-cdmuted font-medium">Moving time:</span>{' '}
                                ~{formatHoursShort(yearEndProjection.movingTimeHours)} h
                                <span className="text-cdmuted"> (goal {formatHoursShort(g.movingTimeHours)} h)</span>
                            </p>
                        ) : null}
                        {g.elevationM > 0 ? (
                            <p className={projectionTone(projElevStatus)}>
                                <span className="text-cdmuted font-medium">Elevation:</span>{' '}
                                ~{Math.round(yearEndProjection.elevationM).toLocaleString('en-GB')} m
                                <span className="text-cdmuted"> (goal {g.elevationM} m)</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="pt-2 border-t border-cdborder/50 space-y-2">
                <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Targets</div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-cdtext">
                    <div>
                        <span className="text-cdmuted block text-[9px]">km</span>
                        <span className="tabular-nums font-semibold">{g.distanceKm || '—'}</span>
                    </div>
                    <div>
                        <span className="text-cdmuted block text-[9px]">hours</span>
                        <span className="tabular-nums font-semibold">
                            {g.movingTimeHours ? formatHoursShort(g.movingTimeHours) : '—'}
                        </span>
                    </div>
                    <div>
                        <span className="text-cdmuted block text-[9px]">m</span>
                        <span className="tabular-nums font-semibold">{g.elevationM || '—'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
