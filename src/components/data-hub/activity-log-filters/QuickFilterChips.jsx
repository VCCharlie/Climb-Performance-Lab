import React, { useState } from 'react';
import { Chip, cn, inputBaseClass } from '../../ui';
import { ACTIVITY_SPORT_TYPE_FILTER_OPTIONS } from '../../../utils/activitySportTypeFilters';

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
    noStravaLinkOnly,
    onNoStravaLinkOnlyChange,
    possibleDuplicatesOnly,
    onPossibleDuplicatesOnlyChange,
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
    hasTagOnly,
    onHasTagOnlyChange,
    activeSportTypes = [],
    toggleSportType,
    gearFilterOptions,
    filterGearId,
    onFilterGearIdChange,
}) {
    const [moreOpen, setMoreOpen] = useState(false);
    const showSecondary = !compact || moreOpen;
    const selectedSportTypes = new Set(activeSportTypes);

    const secondaryActive = Boolean(
        rollingDays === 14
        || stravaLinkedOnly
        || noStravaLinkOnly
        || possibleDuplicatesOnly
        || longRideOnly
        || missingHrOnly
        || hasTagOnly
        || activeSportTypes.length > 0
        || filterGearId,
    );

    const secondaryChips = (
        <>
            <Chip
                size="xs"
                selected={rollingDays === 14}
                onClick={() => {
                    onRollingDaysChange((cur) => (cur === 14 ? null : 14));
                    onThisWeekOnlyChange(false);
                }}
            >
                Last 14d
            </Chip>
            <Chip
                size="xs"
                selected={stravaLinkedOnly}
                disabled={!stravaGetToken}
                onClick={() => {
                    onStravaLinkedOnlyChange((v) => {
                        const next = !v;
                        if (next) onNoStravaLinkOnlyChange(false);
                        return next;
                    });
                }}
            >
                Strava link
            </Chip>
            <Chip
                size="xs"
                selected={noStravaLinkOnly}
                onClick={() => {
                    onNoStravaLinkOnlyChange((v) => {
                        const next = !v;
                        if (next) onStravaLinkedOnlyChange(false);
                        return next;
                    });
                }}
                title="Activities without a linked Strava id"
            >
                No Strava link
            </Chip>
            <Chip
                size="xs"
                selected={possibleDuplicatesOnly}
                onClick={() => onPossibleDuplicatesOnlyChange((v) => !v)}
                title="Show rows that match another activity on the same day (same title + duration)"
            >
                Possible duplicates
            </Chip>
            <Chip
                size="xs"
                selected={longRideOnly}
                onClick={() => onLongRideOnlyChange((v) => !v)}
                title="Distance > 100 km"
            >
                Long ride
            </Chip>
            <Chip
                size="xs"
                selected={missingHrOnly}
                onClick={() => onMissingHrOnlyChange((v) => !v)}
                title="Avg HR missing or zero"
            >
                No HR
            </Chip>
        </>
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
                <Chip
                    size="xs"
                    selected={thisWeekOnly}
                    onClick={() => {
                        onThisWeekOnlyChange((v) => !v);
                        onRollingDaysChange(null);
                    }}
                >
                    This week
                </Chip>
                <Chip
                    size="xs"
                    selected={rollingDays === 7}
                    onClick={() => {
                        onRollingDaysChange((cur) => (cur === 7 ? null : 7));
                        onThisWeekOnlyChange(false);
                    }}
                >
                    Last 7d
                </Chip>
                <Chip
                    size="xs"
                    selected={rollingDays === 30}
                    onClick={() => {
                        onRollingDaysChange((cur) => (cur === 30 ? null : 30));
                        onThisWeekOnlyChange(false);
                    }}
                >
                    Last 30d
                </Chip>
                <Chip
                    size="xs"
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
                    size="xs"
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
                    size="xs"
                    selected={highLoadOnly}
                    onClick={() => onHighLoadOnlyChange((v) => !v)}
                    title="Load (TSS) > 120"
                >
                    High load
                </Chip>
                <Chip
                    size="xs"
                    selected={hasTagOnly}
                    onClick={() => onHasTagOnlyChange((v) => !v)}
                    title="Activities with at least one tag"
                >
                    Has tag
                </Chip>
                {compact ? (
                    <button
                        type="button"
                        onClick={() => setMoreOpen((v) => !v)}
                        className={cn(
                            'inline-flex items-center justify-center font-medium rounded-full',
                            'px-1.5 py-0 min-h-[22px] text-[10px] leading-tight cd-focus-ring cd-transition',
                            moreOpen || secondaryActive
                                ? 'border border-cdprimary/40 bg-cdprimarycontainer/30 text-cdprimary'
                                : 'border border-cdborder text-cdmuted hover:text-cdtext hover:border-cdprimary/30',
                        )}
                        aria-expanded={moreOpen}
                    >
                        {moreOpen ? 'Fewer filters' : 'More filters'}
                        {secondaryActive && !moreOpen ? ' ·' : ''}
                    </button>
                ) : (
                    secondaryChips
                )}
            </div>

            {showSecondary && compact && (
                <div className="flex flex-wrap gap-1.5 items-center">
                    {secondaryChips}
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[9px] font-semibold text-cdmuted uppercase shrink-0 mr-0.5">Type</span>
                {ACTIVITY_SPORT_TYPE_FILTER_OPTIONS.map(({ type, label }) => (
                    <Chip
                        key={type}
                        size="xs"
                        variant="filter"
                        selected={selectedSportTypes.has(type)}
                        onClick={() => toggleSportType?.(type)}
                        title={`Show ${type} activities only (toggle multiple types)`}
                    >
                        {label}
                    </Chip>
                ))}
            </div>

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
