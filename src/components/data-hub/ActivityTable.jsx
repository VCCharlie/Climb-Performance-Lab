
import React from 'react';
import {
    ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Monitor, Bike, Footprints,
    Mountain, Edit2, Trash2, ExternalLink, Route, Trophy, Crown,
} from 'lucide-react';
import { formatDateDDMMYYYY, formatTime } from '../../utils';
import { resolveStravaGearDisplay } from '../../utils/stravaBikesLocalMap';
import { getKomBadgeCountsFromSummary, getKomBadgeDisplaySlots } from '../../utils/stravaSegmentKomSummary';
import { ACTIVITY_TABLE_COLUMNS, MONTH_ORDER } from '../../config';

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-yellow-400 inline" /> : <ChevronDown size={12} className="text-yellow-400 inline" />;
};

export const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false, showBulkSelect = false, allVisibleSelected = false, onToggleSelectAllVisible }) => (
    <thead className="bg-cdbg text-cdmuted uppercase font-bold sticky top-0 z-10 shadow-md text-[0.65rem] tracking-wider">
        <tr>
            {showBulkSelect && (
                <th className="px-1 py-1.5 w-8 text-center">
                    <input
                        type="checkbox"
                        className="accent-yellow-400 w-3.5 h-3.5"
                        checked={allVisibleSelected}
                        onChange={onToggleSelectAllVisible}
                        title="Select all visible"
                    />
                </th>
            )}
            {isPreview && <th className="px-1.5 py-1.5 w-8"></th>}
            {ACTIVITY_TABLE_COLUMNS.map((col) => (
                <th key={col.key} className={`px-1.5 py-1.5 cursor-pointer hover:bg-cdsurface transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
                    <span className={`flex items-center gap-0.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="px-1 py-1.5 text-right w-24">Links</th>}
        </tr>
    </thead>
);

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

export const Row = React.memo(({
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
    showBulkSelect = false,
}) => {
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

    if (!act) return null;

    const renderCell = (col) => {
        try {
            const val = act[col.key];
            if (val === null || val === undefined) return <span className="text-slate-600">-</span>;

            switch (col.key) {
                case 'date': return <span className="text-cdtext whitespace-nowrap">{formatDateDDMMYYYY(val)}</span>;
                case 'type': return (
                    <div
                        className={`flex justify-center items-center h-full ${isPreview ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                        onClick={(e) => { if (isPreview && onToggleType) { e.stopPropagation(); onToggleType(act.id); } }}
                        title={isPreview ? `Huidig: ${val}. Klik om te wijzigen.` : val}
                    >
                        {val === 'VirtualRide' ? <Monitor size={15} className="text-orange-400" title="Virtual Ride" /> :
                            val === 'Run' ? <Footprints size={15} className="text-blue-400" title="Run" /> :
                                val === 'Walk' ? <Footprints size={15} className="text-green-300" title="Walk" /> :
                                    val === 'Hike' ? <Mountain size={15} className="text-green-500" title="Hike" /> :
                                        <Bike size={15} className="text-green-400" title="Ride" />}
                    </div>
                );
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
                    if (!isPreview && onViewDetail && val) {
                        return (
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
                        );
                    }
                    return (
                        <span className="font-medium text-cdtext block truncate" title={val} style={{ maxWidth: 'none' }}>
                            {val}
                        </span>
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
                case 'climbing': case 'avg_power': return <span className="text-cdmuted">{Math.round(val || 0)}</span>;
                case 'norm_power': return <span className="font-bold text-yellow-400">{Math.round(val || 0)}</span>;
                case 'load': return <span className="font-bold text-blue-400">{Math.round(val || 0)}</span>;
                case 'rpe': return <span className="text-cdmuted">{val || '-'}</span>;
                default: return <span className={`text-${col.text || 'slate-500'}`}>{val ? Math.round(val) : '-'}</span>;
            }
        } catch (e) {
            console.error("Error rendering cell", col.key, e);
            return <span className="text-red-500 text-xs">Err</span>;
        }
    };

    return (
        <tr
            id={act.id != null ? `activity-row-${act.id}` : undefined}
            className={`group hover:bg-cdborder/50 transition-colors border-b border-cdborder/50 ${isSelected && showBulkSelect ? 'bg-cdborder/30' : ''}`}
        >
            {showBulkSelect && (
                <td className="px-1 py-1 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(act.id)}
                        className="accent-yellow-400 w-3.5 h-3.5 cursor-pointer"
                    />
                </td>
            )}
            {isPreview && <td className="px-1.5 py-1 w-8"><input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-green-500 cursor-pointer" /></td>}
            {ACTIVITY_TABLE_COLUMNS.map(col => <td key={col.key} className={`px-1.5 py-1 text-${col.align} text-[11px] leading-tight ${col.width || ''}`}>{renderCell(col)}</td>)}
            {!isPreview && <td className="px-1 py-1 text-right w-24">
                {isConfirmingDelete ? (
                    <div className="flex gap-2 justify-end">
                        <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); onDelete(act.id); }} className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">SURE?</button>
                        <button onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }} className="text-cdmuted text-xs px-2 py-1">Cancel</button>
                    </div>
                ) : (
                    <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {onOpenProfiler && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenProfiler(act, profilerClimbByActivityId?.get(String(act.id)));
                                }}
                                className="text-cdmuted hover:text-emerald-400 p-0.5 rounded hover:bg-cdborder/40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
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
                                className="text-cdmuted hover:text-blue-400 p-0.5 flex items-center rounded hover:bg-cdborder/40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in Intervals.icu"
                                aria-label="Open in Intervals.icu"
                            >
                                <ExternalLink size={13} />
                            </a>
                        )}
                        {act.strava_id && (
                            <a
                                href={`https://www.strava.com/activities/${act.strava_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cdmuted hover:text-orange-400 p-0.5 flex items-center rounded hover:bg-cdborder/40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in Strava"
                                aria-label="Open in Strava"
                            >
                                <StravaIcon />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEdit(act); }}
                            className="text-cdmuted hover:text-yellow-400 p-0.5 rounded hover:bg-cdborder/40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                            title="Edit"
                            aria-label="Edit activity"
                        >
                            <Edit2 size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(true); }}
                            className="text-cdmuted hover:text-red-400 p-0.5 rounded hover:bg-cdborder/40 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none"
                            title="Delete"
                            aria-label="Delete activity"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </td>}
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
        prevProps.profilerClimbByActivityId === nextProps.profilerClimbByActivityId &&
        prevProps.onOpenProfiler === nextProps.onOpenProfiler &&
        prevProps.onViewDetail === nextProps.onViewDetail
    );
});

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
    showBulkSelect = false,
    allVisibleSelected = false,
    onToggleSelectAllVisible,
}) => {
    return (
        <div className="overflow-x-auto overflow-y-auto flex-1 border border-cdborder rounded-lg custom-scrollbar relative max-h-[70vh]">
            <table className="w-full text-left text-[11px] leading-tight whitespace-nowrap">
                <TableHeader
                    config={sortConfig}
                    requestSort={onSort}
                    hasActions={true}
                    isPreview={false}
                    showBulkSelect={showBulkSelect}
                    allVisibleSelected={allVisibleSelected}
                    onToggleSelectAllVisible={onToggleSelectAllVisible}
                />
                <tbody className="divide-y divide-cdborder bg-cdsurface">
                    {isGroupedView ? (
                        Object.keys(activities).sort((a, b) => sortConfig.direction === 'asc' ? a - b : b - a).map(year => (
                            <React.Fragment key={year}>
                                <tr id={`year-${year}`} className="bg-cdborder/50 scroll-mt-10"><td colSpan={ACTIVITY_TABLE_COLUMNS.length + 1 + (showBulkSelect ? 1 : 0)} className="p-2 font-bold text-cdtext"><button type="button" onClick={() => onToggleYear(year)} className="flex items-center gap-2 w-full text-left hover:text-yellow-400">{isYearExpanded(year) ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {year}</button></td></tr>
                                {isYearExpanded(year) && Object.keys(activities[year]).sort((a, b) => { const diff = MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a); return sortConfig.direction === 'asc' ? -diff : diff; }).map(month => (
                                    <React.Fragment key={month}>
                                        <tr id={`month-${year}-${month}`} className="bg-cdborder/20 scroll-mt-12"><td colSpan={ACTIVITY_TABLE_COLUMNS.length + 1 + (showBulkSelect ? 1 : 0)} className="px-8 py-1 text-[10px] uppercase font-bold text-cdmuted"><button type="button" onClick={() => onToggleMonth(year, month)} className="flex items-center gap-1 hover:text-cdtext text-left w-full transition-colors">{isMonthExpanded(year, month) ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {month}</button></td></tr>
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
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
});

export default ActivityTable;
