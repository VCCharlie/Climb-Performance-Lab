import React from 'react';
import { Pencil, X } from 'lucide-react';
import { getVolumeScheduleStatus } from '../../utils/volumeGoals';
import {
    inputCls,
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
 * @param {boolean} props.isEd
 * @param {{ distanceKm: string, movingTimeHours: string, elevationM: string } | null} props.dr
 * @param {() => void} props.onStartEdit
 * @param {() => void} props.onCancelEdit
 * @param {() => void} props.onApplyEdit
 * @param {(field: 'distanceKm'|'movingTimeHours'|'elevationM', delta: number) => void} props.onBumpDraft
 * @param {(field: 'distanceKm'|'movingTimeHours'|'elevationM', value: string) => void} props.onDraftChange
 */
export function VolumeGoalPeriodCard({
    id,
    title,
    subtitle,
    range,
    g,
    s,
    nowRef,
    isEd,
    dr,
    onStartEdit,
    onCancelEdit,
    onApplyEdit,
    onBumpDraft,
    onDraftChange,
}) {
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

    return (
        <div className="rounded-lg border border-cdborder/80 bg-cdbg/30 p-3 space-y-3">
            <div className="flex justify-between items-start gap-2">
                <div>
                    <div className="text-xs font-bold text-cdtext">{title}</div>
                    <div className="text-[10px] text-cdmuted">{subtitle}</div>
                </div>
                {!isEd ? (
                    <button
                        type="button"
                        onClick={onStartEdit}
                        className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cdaccent hover:underline px-1 py-0.5 rounded border border-cdborder/60 hover:bg-cdborder/30"
                    >
                        <Pencil className="w-3 h-3" aria-hidden />
                        Edit
                    </button>
                ) : (
                    <div className="flex gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold rounded border border-cdborder text-cdmuted hover:bg-cdborder/40"
                        >
                            <X className="w-3 h-3" aria-hidden />
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onApplyEdit}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-cdaccent text-white hover:opacity-90"
                        >
                            Apply
                        </button>
                    </div>
                )}
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

            <div className="pt-2 border-t border-cdborder/50 space-y-2">
                <div className="text-[10px] font-bold text-cdmuted uppercase tracking-wide">Targets</div>
                {!isEd ? (
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-cdtext">
                        <div>
                            <span className="text-cdmuted block text-[9px]">km</span>
                            <span className="font-mono font-semibold">{g.distanceKm || '—'}</span>
                        </div>
                        <div>
                            <span className="text-cdmuted block text-[9px]">hours</span>
                            <span className="font-mono font-semibold">
                                {g.movingTimeHours ? formatHoursShort(g.movingTimeHours) : '—'}
                            </span>
                        </div>
                        <div>
                            <span className="text-cdmuted block text-[9px]">m</span>
                            <span className="font-mono font-semibold">{g.elevationM || '—'}</span>
                        </div>
                    </div>
                ) : dr ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <label className="space-y-0.5">
                                <span className="text-cdmuted block">km</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={dr.distanceKm}
                                    onChange={(e) => onDraftChange('distanceKm', e.target.value)}
                                    className={inputCls}
                                    aria-label={`${title} distance goal km`}
                                />
                                <div className="flex gap-0.5 mt-0.5">
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('distanceKm', -10)}>-10</button>
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('distanceKm', 10)}>+10</button>
                                </div>
                            </label>
                            <label className="space-y-0.5">
                                <span className="text-cdmuted block">hours</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={dr.movingTimeHours}
                                    onChange={(e) => onDraftChange('movingTimeHours', e.target.value)}
                                    className={inputCls}
                                    aria-label={`${title} moving time goal hours`}
                                />
                                <div className="flex gap-0.5 mt-0.5">
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('movingTimeHours', -0.5)}>-0.5</button>
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('movingTimeHours', 0.5)}>+0.5</button>
                                </div>
                            </label>
                            <label className="space-y-0.5">
                                <span className="text-cdmuted block">m</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={dr.elevationM}
                                    onChange={(e) => onDraftChange('elevationM', e.target.value)}
                                    className={inputCls}
                                    aria-label={`${title} elevation goal meters`}
                                />
                                <div className="flex gap-0.5 mt-0.5">
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('elevationM', -250)}>-250</button>
                                    <button type="button" className="flex-1 py-0.5 text-[9px] rounded bg-cdborder/50" onClick={() => onBumpDraft('elevationM', 250)}>+250</button>
                                </div>
                            </label>
                        </div>
                        <p className="text-[9px] text-cdmuted">Changes apply only after you tap Apply.</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
