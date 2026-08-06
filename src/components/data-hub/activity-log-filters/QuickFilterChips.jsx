import React from 'react';
import { Chip, inputBaseClass, cn } from '../../ui';

/**
 * Quick filter chips for Activity Log — unified Chip styling (no per-filter rainbow colors).
 */
export default function QuickFilterChips({
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
                {[7, 14, 30].map((d) => (
                    <Chip
                        key={d}
                        size="sm"
                        selected={rollingDays === d}
                        onClick={() => {
                            onRollingDaysChange((cur) => (cur === d ? null : d));
                            onThisWeekOnlyChange(false);
                        }}
                    >
                        Last {d}d
                    </Chip>
                ))}
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
                    selected={highLoadOnly}
                    onClick={() => onHighLoadOnlyChange((v) => !v)}
                    title="Load (TSS) > 120"
                >
                    High load
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
        </div>
    );
}
