import React, { useState, useRef, useEffect } from 'react';
import {
    MoreVertical, Edit2, Trash2, ExternalLink, Route, Eye,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils';
import { getActivityCardMetrics } from '../../utils/activityCardMetrics';
import { cn } from '../ui/cn';
import AnchoredDropdownPortal from '../ui/AnchoredDropdownPortal';
import ActivityTypeIcon from './ActivityTypeIcon';

const StravaIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="shrink-0" aria-hidden>
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

const metricToneClass = {
    np: 'text-yellow-400 font-semibold',
    load: 'text-blue-400 font-semibold',
    muted: 'text-cdtext',
};

const MenuItem = ({ onClick, href, external, children, className = 'text-cdtext' }) => {
    const cls = `w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-cdborder/40 cd-transition ${className}`;
    if (href) {
        return (
            <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className={cls}
                onClick={onClick}
            >
                {children}
            </a>
        );
    }
    return (
        <button type="button" className={cls} onClick={onClick}>
            {children}
        </button>
    );
};

const ActivityCard = React.memo(({
    act,
    onDelete,
    onEdit,
    onViewDetail,
    isSelected = false,
    onToggleSelect,
    onOpenProfiler,
    profilerClimbByActivityId,
    showBulkSelect = false,
    visibleColumns,
    profileFtp,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const menuButtonRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onDoc = (e) => {
            const inButton = menuButtonRef.current?.contains(e.target);
            const inMenu = e.target.closest('[data-anchored-dropdown]');
            if (!inButton && !inMenu) {
                setMenuOpen(false);
                setConfirmDelete(false);
            }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                setConfirmDelete(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    if (!act) return null;

    const metrics = getActivityCardMetrics(act, visibleColumns, profileFtp);
    const title = act.title || 'Untitled activity';
    const climbMatch = profilerClimbByActivityId?.get(String(act.id));

    const closeMenu = () => {
        setMenuOpen(false);
        setConfirmDelete(false);
    };

    return (
        <article
            id={act.id != null ? `activity-row-${act.id}` : undefined}
            className={cn(
                'rounded-lg border border-cdborder/60 bg-cdsurface cd-transition',
                isSelected && showBulkSelect && 'ring-2 ring-cdprimary/40 border-cdprimary/30 bg-cdprimarycontainer/20',
            )}
        >
            <div className="flex items-start gap-2 p-3">
                {showBulkSelect && (
                    <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            className="accent-cdprimary w-4 h-4 cursor-pointer"
                            checked={isSelected}
                            onChange={() => onToggleSelect?.(act.id)}
                            aria-label={`Select ${title}`}
                        />
                    </div>
                )}

                <button
                    type="button"
                    className="flex-1 min-w-0 text-left cd-focus-ring rounded-cdsm"
                    onClick={() => onViewDetail?.(act)}
                    aria-label={`View details for ${title}`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <ActivityTypeIcon type={act.type} size={15} />
                        <span className="text-[11px] text-cdmuted tabular-nums shrink-0">
                            {act.date ? formatDateDDMMYYYY(act.date) : '—'}
                        </span>
                    </div>
                    <h3 className="font-semibold text-sm text-cdtext truncate mt-0.5" title={title}>
                        {title}
                    </h3>
                    {metrics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {metrics.map((m) => (
                                <span
                                    key={m.key}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-cdborder/35 border border-cdborder/50 tabular-nums"
                                >
                                    <span className="text-cdmuted font-medium">{m.label}</span>
                                    <span className={metricToneClass[m.tone] || metricToneClass.muted}>{m.value}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </button>

                <div className="relative shrink-0">
                    <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-2 rounded-md text-cdmuted hover:text-cdtext hover:bg-cdborder/40 cd-transition cd-focus-ring"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label={`Actions for ${title}`}
                    >
                        <MoreVertical size={16} aria-hidden />
                    </button>

                    <AnchoredDropdownPortal
                        open={menuOpen}
                        anchorRef={menuButtonRef}
                        onClose={closeMenu}
                        minWidth={176}
                        className="min-w-[11rem]"
                    >
                        {confirmDelete ? (
                            <div className="p-2 space-y-1">
                                <p className="text-xs text-cdmuted px-2 py-1">Delete this activity?</p>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="w-full px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded cd-transition"
                                    onClick={() => { onDelete?.(act.id); closeMenu(); }}
                                >
                                    Confirm delete
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="w-full px-3 py-2 text-sm text-cdmuted hover:bg-cdborder/40 rounded cd-transition"
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <>
                                <MenuItem
                                    onClick={() => { onViewDetail?.(act); closeMenu(); }}
                                >
                                    <Eye size={14} aria-hidden /> Details
                                </MenuItem>
                                <MenuItem onClick={() => { onEdit?.(act); closeMenu(); }}>
                                    <Edit2 size={14} aria-hidden /> Edit
                                </MenuItem>
                                {onOpenProfiler && (
                                    <MenuItem
                                        onClick={() => {
                                            onOpenProfiler(act, climbMatch);
                                            closeMenu();
                                        }}
                                    >
                                        <Route size={14} aria-hidden /> Climb Profiler
                                    </MenuItem>
                                )}
                                {!String(act.id).startsWith('csv_') && (
                                    <MenuItem
                                        href={`https://intervals.icu/activities/${act.id}`}
                                        external
                                        onClick={closeMenu}
                                    >
                                        <ExternalLink size={14} aria-hidden /> Intervals.icu
                                    </MenuItem>
                                )}
                                {act.strava_id && (
                                    <MenuItem
                                        href={`https://www.strava.com/activities/${act.strava_id}`}
                                        external
                                        onClick={closeMenu}
                                    >
                                        <StravaIcon /> Strava
                                    </MenuItem>
                                )}
                                <div className="border-t border-cdborder/60" />
                                <MenuItem
                                    onClick={() => setConfirmDelete(true)}
                                    className="text-red-400"
                                >
                                    <Trash2 size={14} aria-hidden /> Delete
                                </MenuItem>
                            </>
                        )}
                    </AnchoredDropdownPortal>
                </div>
            </div>
        </article>
    );
}, (prev, next) => (
    prev.act === next.act &&
    prev.isSelected === next.isSelected &&
    prev.showBulkSelect === next.showBulkSelect &&
    prev.visibleColumns === next.visibleColumns &&
    prev.profileFtp === next.profileFtp &&
    prev.profilerClimbByActivityId === next.profilerClimbByActivityId
));

export default ActivityCard;
