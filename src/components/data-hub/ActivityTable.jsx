
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ArrowUpDown, ChevronUp, ChevronDown, ChevronRight,
    Edit2, Trash2, ExternalLink, Route, Trophy, Crown, Play, TrendingUp, Zap,
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { resolveStravaGearDisplay } from '../../utils/stravaBikesLocalMap';
import { stravaActivityUrl, stravaFlybyUrl, openExternalUrl, openStravaFlyby, resolveFlybyStravaId } from '../../utils/strava';
import { getKomBadgeCountsFromSummary, getKomBadgeDisplaySlots } from '../../utils/stravaSegmentKomSummary';
import { buildStickyColumnMeta, stickyTableCellProps, stickyActionsCellProps } from '../../utils/activityTableSticky';
import NormPowerCell from './NormPowerCell';
import ZoneMetricCell from './ZoneMetricCell';
import ClimbMatchBadge from './ClimbMatchBadge';
import ActivityTypeIcon from './ActivityTypeIcon';
import { resolveActivityType } from '../../utils/activityVenue';
import {
    flattenActivityList,
    estimateFlattenedRowSize,
    getFlattenedRowKey,
    shouldVirtualizeActivityList,
} from '../../utils/activityListFlatten';
import { registerActivityLogScroller, unregisterActivityLogScroller } from '../../utils/activityLogScroll';
import { ACTIVITY_TABLE_COLUMNS, MONTH_ORDER } from '../../config';
import { activityEfficiencyFactor, activityVariabilityIndex } from '../../utils/rideInsights';
import { decouplingStatusLabel } from '../../utils/coach/aerobicDecoupling';
import TableScrollShell from './TableScrollShell';

function driftPctStatusClass(status) {
    switch (status) {
        case 'good':
            return 'text-emerald-400';
        case 'moderate':
            return 'text-orange-400';
        case 'high':
            return 'text-red-400';
        default:
            return 'text-cdmuted';
    }
}

function DriftPctCell({ pct, status, title }) {
    if (!Number.isFinite(Number(pct))) return <span className="text-cdmuted">-</span>;
    return (
        <span
            className={`font-mono tabular-nums ${driftPctStatusClass(status)}`}
            title={title || (status ? decouplingStatusLabel(status) : 'HR drift %')}
        >
            {Number(pct).toFixed(1)}%
        </span>
    );
}
import {
    tableClass,
    tableHeadClass,
    tableHeadCellClass,
    tableBodyClass,
    tableRowStateClass,
    tableCellClass,
    tableGroupYearClass,
    tableGroupMonthClass,
} from '../ui/tableStyles';

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 inline" />;
    return config.direction === 'asc'
        ? <ChevronUp size={12} className="text-cdprimary inline" />
        : <ChevronDown size={12} className="text-cdprimary inline" />;
};

export const TableHeader = ({
    config,
    requestSort,
    hasActions = true,
    isPreview = false,
    showBulkSelect = false,
    allVisibleSelected = false,
    onToggleSelectAllVisible,
    columns = ACTIVITY_TABLE_COLUMNS,
    stickyMeta = null,
}) => {
    const actionsSticky = stickyActionsCellProps(stickyMeta, { isHeader: true });
    return (
    <thead className={tableHeadClass}>
        <tr>
            {showBulkSelect && (() => {
                const sticky = stickyTableCellProps('__bulk__', stickyMeta, { isHeader: true });
                return (
                <th
                    className={`${tableHeadCellClass} w-8 text-center ${sticky.className}`.trim()}
                    style={sticky.style}
                >
                    <input
                        type="checkbox"
                        className="accent-cdprimary w-3.5 h-3.5 cursor-pointer"
                        checked={allVisibleSelected}
                        onChange={onToggleSelectAllVisible}
                        title="Select all visible"
                    />
                </th>
                );
            })()}
            {isPreview && <th className={`${tableHeadCellClass} w-8`} />}
            {columns.map((col) => {
                const sticky = stickyTableCellProps(col.key, stickyMeta, { isHeader: true });
                return (
                <th
                    key={col.key}
                    className={`${tableHeadCellClass} text-${col.align} ${col.width || ''} ${sticky.className}`.trim()}
                    style={sticky.style}
                    onClick={() => requestSort && requestSort(col.key)}
                >
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <span>{col.label}</span>
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                    </span>
                </th>
                );
            })}
            {hasActions && (
                <th
                    className={`${tableHeadCellClass} text-right w-24 ${actionsSticky.className}`.trim()}
                    style={actionsSticky.style}
                >
                    Links
                </th>
            )}
        </tr>
    </thead>
    );
};

// Strava logo SVG (inline, geen extra dependency)
const StravaIcon = () => (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="shrink-0">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

/** Activity log: up to 3 crown/trophy icons, then +N if more segment places; PR text after. */
const StravaKomSummaryBadges = ({ summary }) => {
    const { shown, hiddenCount, totalKom } = getKomBadgeDisplaySlots(summary, 3);
    const pr = Number(summary?.prCount) || 0;
    const label = String(summary?.label || '').trim();
    const hasPrText = pr > 0 || /^PR/i.test(label);

    if (shown.length === 0 && !hasPrText) return null;

    return (
        <span className="inline-flex flex-nowrap items-center gap-0.5 shrink-0">
            {shown.map((slot, i) => (slot.kind === 'crown' ? (
                <Crown
                    key={`slot-${i}-c`}
                    size={14}
                    className="text-amber-400 shrink-0"
                    fill="currentColor"
                    strokeWidth={1.25}
                    aria-hidden
                    title="Overall #1 on segment"
                />
            ) : (
                <span
                    key={`slot-${i}-t-${slot.rank}`}
                    className="inline-flex items-center gap-0.5 shrink-0"
                    title={`#${slot.rank} on segment leaderboard`}
                >
                    <Trophy
                        size={15}
                        className="shrink-0 text-amber-500/90 dark:text-amber-400/90"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                    />
                    <span className="text-[10px] font-semibold tabular-nums text-cdtext leading-none min-w-[0.65rem]">
                        {slot.rank}
                    </span>
                </span>
            )))}
            {hiddenCount > 0 ? (
                <span
                    className="text-[9px] font-bold text-cdmuted tabular-nums shrink-0"
                    title={`${totalKom} segment leaderboard places — open activity for full list`}
                >
                    +
                    {hiddenCount}
                </span>
            ) : null}
            {hasPrText ? (
                <span className="text-[10px] font-semibold text-orange-400/95 shrink-0">
                    {pr > 1 ? `${pr}×` : ''}
                    PR
                </span>
            ) : null}
        </span>
    );
};

export const Row = React.memo(React.forwardRef(({
    act,
    onDelete,
    onEdit,
    onViewDetail,
    isPreview = false,
    isSelected = false,
    onToggleSelect,
    onToggleType,
    onOpenProfiler,
    profilerClimbByActivityId,
    onFilterByGearId,
    showBulkSelect = false,
    profileFtp,
    profileMaxHr,
    getStravaToken,
    columns = ACTIVITY_TABLE_COLUMNS,
    stickyMeta = null,
    ...trProps
}, ref) => {
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

    if (!act) return null;

    const stravaUrl = stravaActivityUrl(act.strava_id);
    const flybyStravaId = resolveFlybyStravaId(act);
    const flybyUrl = flybyStravaId ? stravaFlybyUrl(flybyStravaId) : null;
    const climbMatch = profilerClimbByActivityId?.get(String(act.id));

    const renderCell = (col) => {
        try {
            if (col.key === 'intensity_factor') {
                return (
                    <ZoneMetricCell
                        metric="if"
                        normPower={act.norm_power}
                        profileFtp={profileFtp}
                    />
                );
            }

            if (col.key === 'variability_index') {
                const vi = activityVariabilityIndex(act.norm_power, act.avg_power);
                if (vi == null) return <span className="text-cdmuted">-</span>;
                return (
                    <span
                        className="text-cdmuted font-mono tabular-nums"
                        title="Variability Index (NP ÷ average power)"
                    >
                        {vi.toFixed(2)}
                    </span>
                );
            }

            if (col.key === 'efficiency_factor') {
                const ef = activityEfficiencyFactor(act.norm_power, act.avg_hr);
                if (ef == null) return <span className="text-cdmuted">-</span>;
                return (
                    <span
                        className="text-cdmuted font-mono tabular-nums"
                        title="Efficiency Factor (NP ÷ average HR, W/bpm)"
                    >
                        {ef.toFixed(2)}
                    </span>
                );
            }

            if (col.key === 'decoupling_pct') {
                return (
                    <DriftPctCell
                        pct={act.decoupling_pct}
                        status={act.decoupling_status}
                        title="Steady-ride decoupling (stream analysis)"
                    />
                );
            }

            if (col.key === 'threshold_drift_pct') {
                return (
                    <DriftPctCell
                        pct={act.threshold_drift_pct}
                        status={act.threshold_drift_status}
                        title="Threshold tempo HR drift (stream analysis)"
                    />
                );
            }

            if (col.key === 'race_drift_pct') {
                return (
                    <DriftPctCell
                        pct={act.race_drift_pct}
                        status={act.race_drift_status}
                        title="Race / variable-effort HR drift (stream analysis)"
                    />
                );
            }

            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-cdmuted">-</span>;

            switch (col.key) {
                case 'date': return <span className="text-cdtext whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
                case 'type': {
                    const resolvedType = resolveActivityType(act);
                    return (
                    <div
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-cdprimary' : ''}`}
                        onClick={(e) => { if (isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); } }}
                        title={isPreview ? `Current: ${val}. Click to change.` : resolvedType}
                    >
                        <ActivityTypeIcon type={resolvedType} size={15} />
                    </div>
                    );
                }
                case 'data_source': {
                    if (isPreview) return <span className="text-cdmuted">—</span>;
                    const hasStrava = !!act.strava_id;
                    return (
                        <span
                            className="flex justify-center"
                            title={hasStrava ? 'Intervals + Strava' : 'Intervals only'}
                        >
                            {hasStrava ? (
                                <span className="text-[9px] font-bold text-orange-400 leading-none">I+S</span>
                            ) : (
                                <span className="text-[9px] text-cdmuted leading-none">I</span>
                            )}
                        </span>
                    );
                }
                case 'title': {
                    const titleContent = !isPreview && onViewDetail && val ? (
                        <button
                            type="button"
                            className="font-medium text-cdtext block truncate text-left w-full hover:text-cdaccent hover:underline"
                            title={`${val} — click for details`}
                            style={{ maxWidth: 'none' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail(act);
                            }}
                        >
                            {val}
                        </button>
                    ) : (
                        <span className="font-medium text-cdtext block truncate" title={val} style={{ maxWidth: 'none' }}>
                            {val}
                        </span>
                    );
                    return (
                        <div className="min-w-0">
                            {titleContent}
                            <div className="min-h-[1.125rem]">
                                {climbMatch && (
                                    <ClimbMatchBadge
                                        climb={climbMatch}
                                        activity={act}
                                        onOpenProfiler={onOpenProfiler}
                                        compact
                                    />
                                )}
                            </div>
                        </div>
                    );
                }
                case 'strava_kom_summary': {
                    const s = act.strava_kom_summary;
                    if (!s || typeof s !== 'object') {
                        return <span className="text-cdmuted" title={act.strava_id ? 'Run Strava gear backfill or open details after linking Strava' : 'Link Strava to fetch segment efforts'}>—</span>;
                    }
                    const pr = Number(s.prCount) || 0;
                    const labelTrim = String(s.label || '').trim();
                    const { king, ranks } = getKomBadgeCountsFromSummary(s);
                    const hasKomUi = king > 0 || ranks.length > 0;
                    const hasPr = pr > 0 || /^PR/i.test(labelTrim);
                    if (!hasKomUi && !hasPr) {
                        return <span className="text-cdmuted" title={act.strava_id ? 'Run Strava gear backfill or open details after linking Strava' : 'Link Strava to fetch segment efforts'}>—</span>;
                    }
                    const tooltip = typeof s.tooltip === 'string' && s.tooltip.trim() ? s.tooltip : labelTrim;
                    return (
                        <span
                            className="flex items-center justify-start gap-0.5 text-amber-400/95 min-w-0"
                            title={tooltip}
                        >
                            <StravaKomSummaryBadges summary={s} />
                        </span>
                    );
                }
                case 'gear_name': {
                    const gid = act.gear_id != null ? String(act.gear_id) : '';
                    const { display, title } = resolveStravaGearDisplay(gid || null, typeof val === 'string' ? val : '');
                    if (display === '-') return <span className="text-cdmuted">-</span>;
                    const canFilter = !isPreview && gid && onFilterByGearId;
                    if (canFilter) {
                        return (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFilterByGearId(gid);
                                }}
                                className="flex items-center gap-1 text-orange-400/90 hover:text-orange-300 hover:underline max-w-full text-left"
                                title={`${title} — filter log by this bike`}
                            >
                                <span className="truncate max-w-[7rem] text-[11px] leading-tight">{display}</span>
                            </button>
                        );
                    }
                    return (
                        <span className="flex items-center gap-1 text-orange-400/80" title={title}>
                            <span className="truncate max-w-[7rem] text-[11px] leading-tight">{display}</span>
                        </span>
                    );
                }
                case 'moving_time': return <span className="text-cdmuted font-mono">{formatTime(val)}</span>;
                case 'distance': case 'avg_speed': return <span className="text-cdmuted">{Number(val).toFixed(1)}</span>;
                case 'work': {
                    const w = Number(val);
                    if (!w || Number.isNaN(w)) return <span className="text-cdmuted">-</span>;
                    return <span className="text-cdmuted">{Math.round(w)}</span>;
                }
                case 'climbing': return <span className="text-cdmuted">{Math.round(val || 0)}</span>;
                case 'avg_power': return <ZoneMetricCell metric="power" value={val} profileFtp={profileFtp} />;
                case 'avg_hr':
                case 'max_hr': return <ZoneMetricCell metric="hr" value={val} profileMaxHr={profileMaxHr} />;
                case 'norm_power': return (
                    <span className="inline-flex items-center gap-0.5 justify-end">
                        <Zap size={10} className="text-cdprimary shrink-0" aria-hidden />
                        <NormPowerCell watts={val} profileFtp={profileFtp} />
                    </span>
                );
                case 'load': {
                    const loadVal = Math.round(val || 0);
                    return (
                        <span
                            className="inline-flex items-center gap-0.5 font-bold text-cdblue tabular-nums"
                            title={`Training load: ${loadVal} TSS`}
                        >
                            <TrendingUp size={10} aria-hidden />
                            <span>{loadVal}</span>
                        </span>
                    );
                }
                case 'rpe': return <span className="text-cdmuted">{val || '-'}</span>;
                default: return <span className={`text-${col.text || 'cdmuted'}`}>{val ? Math.round(val) : '-'}</span>;
            }
        } catch (e) {
            console.error("Error rendering cell", col.key, e);
            return <span className="text-red-500 text-xs">Err</span>;
        }
    };

    return (
        <tr
            ref={ref}
            id={act.id != null ? `activity-row-${act.id}` : undefined}
            className={tableRowStateClass({ isSelected, showBulkSelect: showBulkSelect || isPreview })}
            {...trProps}
        >
            {showBulkSelect && (() => {
                const sticky = stickyTableCellProps('__bulk__', stickyMeta, {
                    isSelected,
                    showBulkSelect,
                });
                return (
                <td
                    className={`px-1 py-1 w-8 text-center ${sticky.className}`.trim()}
                    style={sticky.style}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(act.id)}
                        className="accent-cdprimary w-3.5 h-3.5 cursor-pointer"
                    />
                </td>
                );
            })()}
            {isPreview && <td className="px-1.5 py-1 w-8"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {columns.map((col) => {
                const sticky = stickyTableCellProps(col.key, stickyMeta, {
                    isSelected,
                    showBulkSelect,
                });
                return (
                    <td
                        key={col.key}
                        className={`${tableCellClass} text-${col.align} ${col.width || ''} ${sticky.className}`.trim()}
                        style={sticky.style}
                    >
                        {renderCell(col)}
                    </td>
                );
            })}
            {!isPreview && (() => {
                const actionsSticky = stickyActionsCellProps(stickyMeta, { isSelected, showBulkSelect });
                return (
            <td
                className={`px-1 py-1 text-right w-24 ${actionsSticky.className}`.trim()}
                style={actionsSticky.style}
            >
                {isConfirmingDelete ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); onDelete(act.id); }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                        <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }} className="text-cdmuted text-xs px-2 py-1">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity">
                        {onOpenProfiler && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenProfiler(act, profilerClimbByActivityId?.get(String(act.id)));
                                }}
                                className="text-cdmuted hover:text-emerald-400 p-0.5 rounded hover:bg-cdborder/40 cd-focus-ring"
                                title={
                                    profilerClimbByActivityId?.get(String(act.id))
                                        ? 'Open in Climb Profiler'
                                        : act.strava_map
                                            ? 'Open in Climb Profiler (approximation — route from Strava)'
                                            : 'Open in Climb Profiler (default climb — no route in data; pick climb in tab)'
                                }
                                aria-label="Open in Climb Profiler"
                            >
                                <Route size={13} />
                            </button>
                        )}
                        {!String(act.id).startsWith('csv_') && (
                            <a
                                href={`https://intervals.icu/activities/${act.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cdmuted hover:text-blue-400 p-0.5 flex items-center rounded hover:bg-cdborder/40 cd-focus-ring"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in Intervals.icu"
                                aria-label="Open in Intervals.icu"
                            >
                                <ExternalLink size={13} />
                            </a>
                        )}
                        {stravaUrl && (
                            <a
                                href={stravaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cdmuted hover:text-orange-400 p-0.5 flex items-center rounded hover:bg-cdborder/40 cd-focus-ring"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openExternalUrl(stravaUrl);
                                }}
                                title="Open in Strava"
                                aria-label="Open in Strava"
                            >
                                <StravaIcon />
                            </a>
                        )}
                        {flybyUrl && (
                            <a
                                href={flybyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cdmuted hover:text-orange-300 p-0.5 flex items-center rounded hover:bg-cdborder/40 cd-focus-ring"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    void openStravaFlyby(act, { getStravaToken });
                                }}
                                title="Open Strava Flyby"
                                aria-label="Open Strava Flyby"
                            >
                                <Play size={13} />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(act); }}
                            className="text-cdmuted hover:text-cdprimary p-0.5 rounded hover:bg-cdborder/40 cd-focus-ring"
                            title="Edit"
                            aria-label="Edit activity"
                        >
                            <Edit2 size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
                            className="text-cdmuted hover:text-red-400 p-0.5 rounded hover:bg-cdborder/40 cd-focus-ring"
                            title="Delete"
                            aria-label="Delete activity"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </td>
                );
            })()}
        </tr>
    );
}, (prevProps, nextProps) => {
    // Custom equality check for React.memo to prevent massive re-renders on list changes
    // Only re-render a row if the specific activity data changes, or its selection state changes.
    // We ignore function reference changes (onDelete, onEdit) because they are stable by design
    return (
        prevProps.act === nextProps.act &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isPreview === nextProps.isPreview &&
        prevProps.showBulkSelect === nextProps.showBulkSelect &&
        prevProps.columns === nextProps.columns &&
        prevProps.stickyMeta === nextProps.stickyMeta &&
        prevProps.profilerClimbByActivityId === nextProps.profilerClimbByActivityId &&
        prevProps.profileFtp === nextProps.profileFtp &&
        prevProps.profileMaxHr === nextProps.profileMaxHr &&
        prevProps.onOpenProfiler === nextProps.onOpenProfiler &&
        prevProps.onViewDetail === nextProps.onViewDetail
    );
}));

const ActivityTable = React.memo(({
    activities,
    sortConfig,
    onSort,
    onDelete,
    onEdit,
    onViewDetail,
    isGroupedView,
    isYearExpanded,
    onToggleYear,
    isMonthExpanded,
    onToggleMonth,
    onToggleSelectRow,
    selectedActivityIds,
    onOpenProfiler,
    profilerClimbByActivityId,
    onFilterByGearId,
    showBulkSelect = false,
    allVisibleSelected = false,
    onToggleSelectAllVisible,
    profileFtp,
    profileMaxHr,
    getStravaToken,
    visibleColumns = ACTIVITY_TABLE_COLUMNS,
}) => {
    const columns = visibleColumns;
    const colSpan = columns.length + 1 + (showBulkSelect ? 1 : 0);
    const scrollRef = useRef(null);
    const stickyMeta = useMemo(
        () => buildStickyColumnMeta(columns, showBulkSelect, true),
        [columns, showBulkSelect],
    );

    const flatRows = useMemo(
        () => flattenActivityList({
            activities,
            isGroupedView,
            sortConfig,
            isYearExpanded,
            isMonthExpanded,
        }),
        [activities, isGroupedView, sortConfig, isYearExpanded, isMonthExpanded],
    );

    const useVirtual = shouldVirtualizeActivityList(flatRows, { layout: 'table' });

    const virtualizer = useVirtualizer({
        count: useVirtual ? flatRows.length : 0,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => estimateFlattenedRowSize(flatRows[index], 'table'),
        overscan: 12,
        getItemKey: (index) => getFlattenedRowKey(flatRows[index], index),
    });

    const virtualItems = useVirtual ? virtualizer.getVirtualItems() : [];
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom = virtualItems.length > 0
        ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
        : 0;

    const scrollToId = useCallback((id) => {
        const container = scrollRef.current;
        if (!container) return;

        const yearMatch = id.match(/^year-(\d+)$/);
        const monthMatch = id.match(/^month-(\d+)-(.+)$/);

        let rowIndex = -1;
        if (yearMatch) {
            const year = yearMatch[1];
            rowIndex = flatRows.findIndex((r) => r.type === 'year' && String(r.year) === year);
        } else if (monthMatch) {
            const [, year, month] = monthMatch;
            rowIndex = flatRows.findIndex(
                (r) => r.type === 'month' && String(r.year) === year && r.month === month,
            );
        }

        if (rowIndex >= 0 && useVirtual) {
            virtualizer.scrollToIndex(rowIndex, { align: 'start' });
            return;
        }

        const el = container.querySelector(`#${CSS.escape(id)}`);
        if (!el) return;
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const top = elRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: Math.max(0, top - 4), behavior: 'smooth' });
    }, [flatRows, useVirtual, virtualizer]);

    useEffect(() => {
        registerActivityLogScroller({ scrollToId });
        return () => unregisterActivityLogScroller();
    }, [scrollToId]);

    const renderFlatRow = (row) => {
        if (row.type === 'year') {
            return (
                <tr id={`year-${row.year}`} className={tableGroupYearClass}>
                    <td colSpan={colSpan} className="px-3 py-2 font-semibold text-cdtext">
                        <button type="button" onClick={() => onToggleYear(row.year)} className="flex items-center gap-2 w-full text-left hover:text-cdprimary cd-transition cd-focus-ring rounded-cdsm">
                            {isYearExpanded(row.year) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {' '}
                            {row.year}
                        </button>
                    </td>
                </tr>
            );
        }

        if (row.type === 'month') {
            return (
                <tr id={`month-${row.year}-${row.month}`} className={tableGroupMonthClass}>
                    <td colSpan={colSpan} className="px-6 py-1.5 text-xs font-semibold text-cdmuted">
                        <button type="button" onClick={() => onToggleMonth(row.year, row.month)} className="flex items-center gap-1 hover:text-cdtext text-left w-full cd-transition cd-focus-ring rounded-cdsm">
                            {isMonthExpanded(row.year, row.month) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {' '}
                            {row.month}
                        </button>
                    </td>
                </tr>
            );
        }

        const act = row.act;
        return (
            <Row
                key={act.id}
                act={act}
                onDelete={onDelete}
                onEdit={onEdit}
                onViewDetail={onViewDetail}
                onToggleSelect={onToggleSelectRow}
                isSelected={selectedActivityIds?.has(String(act.id))}
                showBulkSelect={showBulkSelect}
                onOpenProfiler={onOpenProfiler}
                profilerClimbByActivityId={profilerClimbByActivityId}
                profileFtp={profileFtp}
                profileMaxHr={profileMaxHr}
                getStravaToken={getStravaToken}
                columns={columns}
                stickyMeta={stickyMeta}
            />
        );
    };

    return (
        <TableScrollShell ref={scrollRef}>
            <table className={tableClass}>
                <TableHeader
                    config={sortConfig}
                    requestSort={onSort}
                    hasActions={true}
                    isPreview={false}
                    showBulkSelect={showBulkSelect}
                    allVisibleSelected={allVisibleSelected}
                    onToggleSelectAllVisible={onToggleSelectAllVisible}
                    columns={columns}
                    stickyMeta={stickyMeta}
                />
                <tbody className={tableBodyClass}>
                    {useVirtual ? (
                        <>
                            {paddingTop > 0 && (
                                <tr aria-hidden="true">
                                    <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
                                </tr>
                            )}
                            {virtualItems.map((virtualRow) => {
                                const row = flatRows[virtualRow.index];
                                const rowKey = getFlattenedRowKey(row, virtualRow.index);
                                if (row.type === 'year') {
                                    return (
                                        <tr
                                            key={rowKey}
                                            ref={virtualizer.measureElement}
                                            data-index={virtualRow.index}
                                            id={`year-${row.year}`}
                                            className={tableGroupYearClass}
                                        >
                                            <td colSpan={colSpan} className="px-3 py-2 font-semibold text-cdtext">
                                                <button type="button" onClick={() => onToggleYear(row.year)} className="flex items-center gap-2 w-full text-left hover:text-cdprimary transition-colors cd-focus-ring rounded-cdsm">
                                                    {isYearExpanded(row.year) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    {' '}
                                                    {row.year}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }
                                if (row.type === 'month') {
                                    return (
                                        <tr
                                            key={rowKey}
                                            ref={virtualizer.measureElement}
                                            data-index={virtualRow.index}
                                            id={`month-${row.year}-${row.month}`}
                                            className={tableGroupMonthClass}
                                        >
                                            <td colSpan={colSpan} className="px-6 py-1.5 text-xs font-semibold text-cdmuted">
                                                <button type="button" onClick={() => onToggleMonth(row.year, row.month)} className="flex items-center gap-1 hover:text-cdtext text-left w-full transition-colors cd-focus-ring rounded-cdsm">
                                                    {isMonthExpanded(row.year, row.month) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    {' '}
                                                    {row.month}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }
                                const act = row.act;
                                return (
                                    <Row
                                        key={rowKey}
                                        ref={virtualizer.measureElement}
                                        data-index={virtualRow.index}
                                        act={act}
                                        onDelete={onDelete}
                                        onEdit={onEdit}
                                        onViewDetail={onViewDetail}
                                        onToggleSelect={onToggleSelectRow}
                                        isSelected={selectedActivityIds?.has(String(act.id))}
                                        showBulkSelect={showBulkSelect}
                                        onOpenProfiler={onOpenProfiler}
                                        profilerClimbByActivityId={profilerClimbByActivityId}
                                        onFilterByGearId={onFilterByGearId}
                                        profileFtp={profileFtp}
                                        profileMaxHr={profileMaxHr}
                                        getStravaToken={getStravaToken}
                                        columns={columns}
                                        stickyMeta={stickyMeta}
                                    />
                                );
                            })}
                            {paddingBottom > 0 && (
                                <tr aria-hidden="true">
                                    <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                                </tr>
                            )}
                        </>
                    ) : isGroupedView ? (
                        Object.keys(activities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                            <React.Fragment key={year}>
                                <tr id={`year-${year}`} className={tableGroupYearClass}><td colSpan={colSpan} className="px-3 py-2 font-semibold text-cdtext"><button type="button" onClick={() => onToggleYear(year)} className="flex items-center gap-2 w-full text-left hover:text-cdprimary cd-transition cd-focus-ring rounded-cdsm">{isYearExpanded(year) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                {isYearExpanded(year) && Object.keys(activities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                    <React.Fragment key={month}>
                                        <tr id={`month-${year}-${month}`} className={tableGroupMonthClass}><td colSpan={colSpan} className="px-6 py-1.5 text-xs font-semibold text-cdmuted"><button type="button" onClick={() => onToggleMonth(year, month)} className="flex items-center gap-1 hover:text-cdtext text-left w-full cd-transition cd-focus-ring rounded-cdsm">{isMonthExpanded(year, month) ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {month}</button></td></tr>
                                        {isMonthExpanded(year, month) && activities[year][month].map(act => (
                                            <Row
                                                key={act.id}
                                                act={act}
                                                onDelete={onDelete}
                                                onEdit={onEdit}
                                                onViewDetail={onViewDetail}
                                                onToggleSelect={onToggleSelectRow}
                                                isSelected={selectedActivityIds?.has(String(act.id))}
                                                showBulkSelect={showBulkSelect}
                                                onOpenProfiler={onOpenProfiler}
                                                profilerClimbByActivityId={profilerClimbByActivityId}
                                                profileFtp={profileFtp}
                                                profileMaxHr={profileMaxHr}
                                                getStravaToken={getStravaToken}
                                                columns={columns}
                                                stickyMeta={stickyMeta}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))
                    ) : (
                        activities.map(act => (
                            <Row
                                key={act.id}
                                act={act}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onViewDetail={onViewDetail}
                                onToggleSelect={onToggleSelectRow}
                                isSelected={selectedActivityIds?.has(String(act.id))}
                                showBulkSelect={showBulkSelect}
                                onOpenProfiler={onOpenProfiler}
                                profilerClimbByActivityId={profilerClimbByActivityId}
                                profileFtp={profileFtp}
                                profileMaxHr={profileMaxHr}
                                getStravaToken={getStravaToken}
                                columns={columns}
                                stickyMeta={stickyMeta}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </TableScrollShell>
    );
});

export default ActivityTable;
