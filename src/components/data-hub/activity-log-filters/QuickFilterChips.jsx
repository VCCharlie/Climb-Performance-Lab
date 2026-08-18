import React, { useState } from 'react';
import { Chip, inputBaseClass, cn } from '../../ui';

/**
 * Quick filter chips for Activity Log — unified Chip styling (no per-filter rainbow colors).
 * @param {boolean} [compact] — mobile card layout: secondary chips behind "More filters".
 */
export default function QuickFilterChips({
    compact = false,
    thisWeekOnly,
    onThisWeekOnlyChange,
    rollingDays,
    onRollingDaysChange,
    stravaGetToken,
    stravaLinkedOnly,
    onStravaLinkedOnlyChange,
    noPowerOnly,
    onNoPowerOnlyChange,
    withPowerOnly,
    onWithPowerOnlyChange,
    highLoadOnly,
    onHighLoadOnlyChange,
    longRideOnly,
    onLongRideOnlyChange,
    missingHrOnly,
    onMissingHrOnlyChange,
    virtualRideChip,
    onVirtualRideChipChange,
    gravelRideChip,
    onGravelRideChipChange,
    mtbRideChip,
    onMtbRideChipChange,
    ebikeRideChip,
    onEbikeRideChipChange,
    indoorFilter,
    onIndoorFilterChange,
    minTss,
    onMinTssChange,
    gearFilterOptions,
    filterGearId,
    onFilterGearIdChange,
}) {
    const [moreOpen, setMoreOpen] = useState(false);
    const showSecondary = !compact || moreOpen;

    const secondaryActive = Boolean(
        rollingDays === 14
        || stravaLinkedOnly
        || longRideOnly
        || missingHrOnly
        || virtualRideChip
        || gravelRideChip
        || mtbRideChip
        || ebikeRideChip
        || filterGearId,
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
                <Chip
                    size="sm"
                    selected={thisWeekOnly}
                    onClick={() => {
                        onThisWeekOnlyChange((v) => !v);
                        onRollingDaysChange(null);
                    }}
                >
                    This week
                </Chip>
                <Chip
                    size="sm"
                    selected={rollingDays === 7}
                    onClick={() => {
                        onRollingDaysChange((cur) => (cur === 7 ? null : 7));
                        onThisWeekOnlyChange(false);
                    }}
                >
                    Last 7d
                </Chip>
                <Chip
                    size="sm"
                    selected={rollingDays === 30}
                    onClick={() => {
                        onRollingDaysChange((cur) => (cur === 30 ? null : 30));
                        onThisWeekOnlyChange(false);
                    }}
                >
                    Last 30d
                </Chip>
                <Chip
                    size="sm"
                    selected={withPowerOnly}
                    onClick={() => {
                        onWithPowerOnlyChange((v) => {
                            const next = !v;
                            if (next) onNoPowerOnlyChange(false);
                            return next;
                        });
                    }}
                >
                    With power
                </Chip>
                <Chip
                    size="sm"
                    selected={noPowerOnly}
                    onClick={() => {
                        onNoPowerOnlyChange((v) => {
                            const next = !v;
                            if (next) onWithPowerOnlyChange(false);
                            return next;
                        });
                    }}
                >
                    No power
                </Chip>
                <Chip
                    size="sm"
                    selected={highLoadOnly}
                    onClick={() => onHighLoadOnlyChange((v) => !v)}
                    title="Load (TSS) > 120"
                >
                    High load
                </Chip>
                {compact ? (
                    <button
                        type="button"
                        onClick={() => setMoreOpen((v) => !v)}
                        className={cn(
                            'text-[10px] font-semibold px-2 py-1 rounded-full border cd-focus-ring cd-transition',
                            moreOpen || secondaryActive
                                ? 'border-cdprimary/40 bg-cdprimarycontainer/30 text-cdprimary'
                                : 'border-cdborder text-cdmuted hover:text-cdtext hover:border-cdprimary/30',
                        )}
                        aria-expanded={moreOpen}
                    >
                        {moreOpen ? 'Fewer filters' : 'More filters'}
                        {secondaryActive && !moreOpen ? ' ·' : ''}
                    </button>
                ) : (
                    <>
                        <Chip
                            size="sm"
                            selected={rollingDays === 14}
                            onClick={() => {
                                onRollingDaysChange((cur) => (cur === 14 ? null : 14));
                                onThisWeekOnlyChange(false);
                            }}
                        >
                            Last 14d
                        </Chip>
                        <Chip
                            size="sm"
                            selected={stravaLinkedOnly}
                            disabled={!stravaGetToken}
                            onClick={() => onStravaLinkedOnlyChange((v) => !v)}
                        >
                            Strava link
                        </Chip>
                        <Chip
                            size="sm"
                            selected={longRideOnly}
                            onClick={() => onLongRideOnlyChange((v) => !v)}
                            title="Distance > 100 km"
                        >
                            Long ride
                        </Chip>
                        <Chip
                            size="sm"
                            selected={missingHrOnly}
                            onClick={() => onMissingHrOnlyChange((v) => !v)}
                            title="Avg HR missing or zero"
                        >
                            No HR
                        </Chip>
                        <Chip
                            size="sm"
                            selected={virtualRideChip}
                            onClick={() => {
                                if (virtualRideChip) {
                                    onVirtualRideChipChange(false);
                                    onIndoorFilterChange('all');
                                } else {
                                    onVirtualRideChipChange(true);
                                    onGravelRideChipChange(false);
                                    onMtbRideChipChange(false);
                                    onEbikeRideChipChange(false);
                                    onIndoorFilterChange('indoor');
                                }
                            }}
                        >
                            Virtual only
                        </Chip>
                        <Chip
                            size="sm"
                            selected={gravelRideChip}
                            onClick={() => {
                                if (gravelRideChip) {
                                    onGravelRideChipChange(false);
                                } else {
                                    onGravelRideChipChange(true);
                                    onMtbRideChipChange(false);
                                    onEbikeRideChipChange(false);
                                    onVirtualRideChipChange(false);
                                    if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                                }
                            }}
                            title="Show activities stored as GravelRide"
                        >
                            Gravel
                        </Chip>
                        <Chip
                            size="sm"
                            selected={mtbRideChip}
                            onClick={() => {
                                if (mtbRideChip) {
                                    onMtbRideChipChange(false);
                                } else {
                                    onMtbRideChipChange(true);
                                    onGravelRideChipChange(false);
                                    onEbikeRideChipChange(false);
                                    onVirtualRideChipChange(false);
                                    if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                                }
                            }}
                            title="Show activities stored as MountainBikeRide"
                        >
                            MTB
                        </Chip>
                        <Chip
                            size="sm"
                            selected={ebikeRideChip}
                            onClick={() => {
                                if (ebikeRideChip) {
                                    onEbikeRideChipChange(false);
                                } else {
                                    onEbikeRideChipChange(true);
                                    onGravelRideChipChange(false);
                                    onMtbRideChipChange(false);
                                    onVirtualRideChipChange(false);
                                    if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                                }
                            }}
                            title="Show activities stored as EBikeRide"
                        >
                            E-bike
                        </Chip>
                    </>
                )}
                {!compact && (
                    <label className="inline-flex items-center gap-1.5 text-[10px] text-cdmuted ml-0.5">
                        <span className="font-semibold shrink-0">TSS &gt;</span>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            value={minTss}
                            onChange={(e) => onMinTssChange(e.target.value)}
                            className={cn(inputBaseClass, 'w-14 !py-1 !px-1.5 text-[10px]')}
                            aria-label="Minimum TSS"
                        />
                    </label>
                )}
            </div>

            {showSecondary && compact && (
                <div className="flex flex-wrap gap-1.5 items-center">
                    <Chip
                        size="sm"
                        selected={rollingDays === 14}
                        onClick={() => {
                            onRollingDaysChange((cur) => (cur === 14 ? null : 14));
                            onThisWeekOnlyChange(false);
                        }}
                    >
                        Last 14d
                    </Chip>
                    <Chip
                        size="sm"
                        selected={stravaLinkedOnly}
                        disabled={!stravaGetToken}
                        onClick={() => onStravaLinkedOnlyChange((v) => !v)}
                    >
                        Strava link
                    </Chip>
                    <Chip
                        size="sm"
                        selected={longRideOnly}
                        onClick={() => onLongRideOnlyChange((v) => !v)}
                        title="Distance > 100 km"
                    >
                        Long ride
                    </Chip>
                    <Chip
                        size="sm"
                        selected={missingHrOnly}
                        onClick={() => onMissingHrOnlyChange((v) => !v)}
                        title="Avg HR missing or zero"
                    >
                        No HR
                    </Chip>
                    <Chip
                        size="sm"
                        selected={virtualRideChip}
                        onClick={() => {
                            if (virtualRideChip) {
                                onVirtualRideChipChange(false);
                                onIndoorFilterChange('all');
                            } else {
                                onVirtualRideChipChange(true);
                                onGravelRideChipChange(false);
                                onMtbRideChipChange(false);
                                onEbikeRideChipChange(false);
                                onIndoorFilterChange('indoor');
                            }
                        }}
                    >
                        Virtual only
                    </Chip>
                    <Chip
                        size="sm"
                        selected={gravelRideChip}
                        onClick={() => {
                            if (gravelRideChip) {
                                onGravelRideChipChange(false);
                            } else {
                                onGravelRideChipChange(true);
                                onMtbRideChipChange(false);
                                onEbikeRideChipChange(false);
                                onVirtualRideChipChange(false);
                                if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                            }
                        }}
                        title="Show activities stored as GravelRide"
                    >
                        Gravel
                    </Chip>
                    <Chip
                        size="sm"
                        selected={mtbRideChip}
                        onClick={() => {
                            if (mtbRideChip) {
                                onMtbRideChipChange(false);
                            } else {
                                onMtbRideChipChange(true);
                                onGravelRideChipChange(false);
                                onEbikeRideChipChange(false);
                                onVirtualRideChipChange(false);
                                if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                            }
                        }}
                        title="Show activities stored as MountainBikeRide"
                    >
                        MTB
                    </Chip>
                    <Chip
                        size="sm"
                        selected={ebikeRideChip}
                        onClick={() => {
                            if (ebikeRideChip) {
                                onEbikeRideChipChange(false);
                            } else {
                                onEbikeRideChipChange(true);
                                onGravelRideChipChange(false);
                                onMtbRideChipChange(false);
                                onVirtualRideChipChange(false);
                                if (indoorFilter === 'indoor') onIndoorFilterChange('all');
                            }
                        }}
                        title="Show activities stored as EBikeRide"
                    >
                        E-bike
                    </Chip>
                    <label className="inline-flex items-center gap-1.5 text-[10px] text-cdmuted ml-0.5">
                        <span className="font-semibold shrink-0">TSS &gt;</span>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            value={minTss}
                            onChange={(e) => onMinTssChange(e.target.value)}
                            className={cn(inputBaseClass, 'w-14 !py-1 !px-1.5 text-[10px]')}
                            aria-label="Minimum TSS"
                        />
                    </label>
                </div>
            )}

            {showSecondary && (
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[10px] text-cdmuted min-w-0 flex-1 sm:max-w-xs">
                        <span className="font-semibold shrink-0">Bike</span>
                        <select
                            value={filterGearId}
                            onChange={(e) => onFilterGearIdChange(e.target.value)}
                            className={cn(inputBaseClass, 'flex-1 min-w-0 !py-1 !px-2 text-[10px]')}
                            title="Filter by bike gear used on matching activities"
                        >
                            <option value="">All bikes</option>
                            {gearFilterOptions.map(({ id, label }) => (
                                <option key={id} value={id}>{label}</option>
                            ))}
                        </select>
                    </label>
                    {filterGearId ? (
                        <button
                            type="button"
                            onClick={() => onFilterGearIdChange('')}
                            className="text-[10px] text-cdprimary hover:underline shrink-0 cd-focus-ring rounded-sm"
                        >
                            Clear bike
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
