import { useState, useMemo, useCallback, useEffect } from 'react';

import { MONTH_ORDER } from '../config';
import { normalizeDate } from '../utils/formatters';
import {
    activityDistanceKm,
    activityMovingTimeSec,
    activityAvgSpeedKmh,
    parseNumericBound,
    inNumericRange,
    activityMatchesLogSearch,
    activityMatchesDriftRange,
} from '../utils/activityFilterMetrics';
import { compareActivitiesForSort } from '../utils/activitySort';
import { resolveActivityType } from '../utils/activityVenue';
import {
    ACTIVITY_LOG_FILTER_PRESET_STORAGE_KEY,
    BUILTIN_ACTIVITY_LOG_FILTER_PRESETS,
    chipStateForPreset,
    parseStoredFilterPresetId,
    detectActiveLogFilterPreset,
} from '../utils/activityLogFilterPresets';
import { safeLocalStorageSet } from '../utils/safeStorage';
import {
    buildGearFilterOptionsFromActivities,
    mergeActiveGearFilterOption,
} from '../utils/activityGearFilterOptions';
import {
    createEmptyMetricFilterState,
    mergePresetsToFilterState,
    toggleMetricPresetIds,
} from '../utils/metricRangePresets';

// Helper inside hook or import
const isValid = (act) => act && act.id && act.date;

/** Local Monday 00:00 → Sunday 23:59:59 for "this week" chip */
function getThisCalendarWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function toLocalYmd(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    const m = `${x.getMonth() + 1}`.padStart(2, '0');
    const day = `${x.getDate()}`.padStart(2, '0');
    return `${x.getFullYear()}-${m}-${day}`;
}

const storedPresetId = typeof window !== 'undefined' ? parseStoredFilterPresetId() : null;
const initialChipState = chipStateForPreset(storedPresetId || 'all');

const useActivityFilter = (activities, profileFtp) => {
    const [search, setSearch] = useState("");
    const [indoorFilter, setIndoorFilter] = useState(initialChipState.indoorFilter);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    /** Quick chips */
    const [thisWeekOnly, setThisWeekOnly] = useState(initialChipState.thisWeekOnly);
    const [rollingDays, setRollingDays] = useState(initialChipState.rollingDays);
    const [stravaLinkedOnly, setStravaLinkedOnly] = useState(initialChipState.stravaLinkedOnly);
    const [noPowerOnly, setNoPowerOnly] = useState(initialChipState.noPowerOnly);
    const [withPowerOnly, setWithPowerOnly] = useState(initialChipState.withPowerOnly);
    const [highLoadOnly, setHighLoadOnly] = useState(initialChipState.highLoadOnly);
    const [longRideOnly, setLongRideOnly] = useState(initialChipState.longRideOnly);
    const [missingHrOnly, setMissingHrOnly] = useState(initialChipState.missingHrOnly);
    const [virtualRideChip, setVirtualRideChip] = useState(initialChipState.virtualRideChip);
    const [gravelRideChip, setGravelRideChip] = useState(initialChipState.gravelRideChip);
    const [mtbRideChip, setMtbRideChip] = useState(initialChipState.mtbRideChip);
    const [ebikeRideChip, setEbikeRideChip] = useState(initialChipState.ebikeRideChip);
    const [minTss, setMinTss] = useState(initialChipState.minTss);
    const [activeLogFilterPresetId, setActiveLogFilterPresetId] = useState(storedPresetId || 'all');

    /** Min/max filters (empty string = no bound). Distance km, speed km/h, power W, duration minutes, elev m, kJ */
    const [filterDistMin, setFilterDistMin] = useState('');
    const [filterDistMax, setFilterDistMax] = useState('');
    const [filterSpeedMin, setFilterSpeedMin] = useState('');
    const [filterSpeedMax, setFilterSpeedMax] = useState('');
    const [filterPowerMin, setFilterPowerMin] = useState('');
    const [filterPowerMax, setFilterPowerMax] = useState('');
    const [filterDurMinMin, setFilterDurMinMin] = useState('');
    const [filterDurMaxMin, setFilterDurMaxMin] = useState('');
    const [filterElevMin, setFilterElevMin] = useState('');
    const [filterElevMax, setFilterElevMax] = useState('');
    const [filterKjMin, setFilterKjMin] = useState('');
    const [filterKjMax, setFilterKjMax] = useState('');
    const [filterDecMin, setFilterDecMin] = useState('');
    const [filterDecMax, setFilterDecMax] = useState('');
    const [filterThrMin, setFilterThrMin] = useState('');
    const [filterThrMax, setFilterThrMax] = useState('');
    const [filterRaceMin, setFilterRaceMin] = useState('');
    const [filterRaceMax, setFilterRaceMax] = useState('');
    /** Strava gear_id (string); empty = no filter */
    const [filterGearId, setFilterGearId] = useState('');

    // We store explicit collapse state.
    const [expandedYears, setExpandedYears] = useState(null);
    const [expandedMonths, setExpandedMonths] = useState(null);

    // -- Actions --
    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    }, []);

    const toggleYear = useCallback((year) => {
        setExpandedYears(p => ({ ...(p || {}), [year]: !(p?.[year]) }));
    }, []);

    const toggleMonth = useCallback((year, month) => {
        const key = `${year}-${month}`;
        setExpandedMonths(p => ({ ...(p || {}), [key]: !(p?.[key]) }));
    }, []);

    const ensureYearExpanded = useCallback((year) => {
        setExpandedYears((p) => ({ ...(p || {}), [year]: true }));
    }, []);

    const ensureMonthExpanded = useCallback((year, month) => {
        const mk = `${year}-${month}`;
        setExpandedYears((p) => ({ ...(p || {}), [year]: true }));
        setExpandedMonths((p) => ({ ...(p || {}), [mk]: true }));
    }, []);

    /** Expand year/month so a grouped row exists in the DOM (e.g. Dashboard deep-link). */
    const openGroupedPathForActivity = useCallback((activity) => {
        if (!activity?.date) return;
        try {
            // ⚡ Bolt Optimization: Use regex for ISO dates to avoid expensive new Date() allocations
            const ymdMatch = String(activity.date).match(/^(\d{4})-(\d{2})-(\d{2})/);
            let y, mIndex;
            if (ymdMatch) {
                y = ymdMatch[1];
                mIndex = parseInt(ymdMatch[2], 10) - 1;
            } else {
                const d = new Date(activity.date);
                if (Number.isNaN(d.getTime())) return;
                y = String(d.getFullYear());
                mIndex = d.getMonth();
            }
            const m = MONTH_ORDER[mIndex];
            const mk = `${y}-${m}`;
            setExpandedYears((p) => ({ ...(p || {}), [y]: true }));
            setExpandedMonths((p) => ({ ...(p || {}), [mk]: true }));
        } catch {
            /* invalid date */
        }
    }, []);

    // Checkers - Note: Default is now false because we prepopulate true keys!
    const isYearExpanded = useCallback((year) => expandedYears?.[year] === true, [expandedYears]);
    const isMonthExpanded = useCallback((year, month) => expandedMonths?.[`${year}-${month}`] === true, [expandedMonths]);

    // Reset expansion state if the underlying activities are cleared.
    // This allows the auto-expand effect to run again when new data arrives.
    useEffect(() => {
        if (!activities || activities.length === 0) {
            queueMicrotask(() => {
                setExpandedYears(null);
                setExpandedMonths(null);
            });
        }
    }, [activities]);

    // -- Derived State --
    const { processedActivities, activitiesForGearFilterOptions } = useMemo(() => {
        if (!activities) {
            return { processedActivities: [], activitiesForGearFilterOptions: [] };
        }
        const weekRange = thisWeekOnly ? getThisCalendarWeekRange() : null;
        const weekStartYmd = weekRange ? toLocalYmd(weekRange.start) : null;
        const weekEndYmd = weekRange ? toLocalYmd(weekRange.end) : null;
        const rollingStart = rollingDays != null && rollingDays > 0
            ? (() => { const s = startOfToday(); s.setDate(s.getDate() - rollingDays); return s; })()
            : null;
        const rollingStartYmd = rollingStart ? toLocalYmd(rollingStart) : null;
        const tssThreshold = minTss === '' || minTss == null ? null : Number(minTss);
        const tssOk = tssThreshold != null && !Number.isNaN(tssThreshold) && tssThreshold > 0;

        const dMin = parseNumericBound(filterDistMin);
        const dMax = parseNumericBound(filterDistMax);
        const spMin = parseNumericBound(filterSpeedMin);
        const spMax = parseNumericBound(filterSpeedMax);
        const pwMin = parseNumericBound(filterPowerMin);
        const pwMax = parseNumericBound(filterPowerMax);
        const durMin = parseNumericBound(filterDurMinMin);
        const durMax = parseNumericBound(filterDurMaxMin);
        const elMin = parseNumericBound(filterElevMin);
        const elMax = parseNumericBound(filterElevMax);
        const kjMin = parseNumericBound(filterKjMin);
        const kjMax = parseNumericBound(filterKjMax);
        const decMin = parseNumericBound(filterDecMin);
        const decMax = parseNumericBound(filterDecMax);
        const thrMin = parseNumericBound(filterThrMin);
        const thrMax = parseNumericBound(filterThrMax);
        const raceMin = parseNumericBound(filterRaceMin);
        const raceMax = parseNumericBound(filterRaceMax);

        const needDist = dMin != null || dMax != null;
        const needSpeed = spMin != null || spMax != null;
        const needDur = durMin != null || durMax != null;
        const needPower = pwMin != null || pwMax != null;
        const needElev = elMin != null || elMax != null;
        const needKj = kjMin != null || kjMax != null;
        const needDec = decMin != null || decMax != null;
        const needThr = thrMin != null || thrMax != null;
        const needRace = raceMin != null || raceMax != null;

        const anyMetric =
            needDist || needSpeed || needPower || needDur || needElev || needKj
            || needDec || needThr || needRace;

        const searchLower = search ? search.toLowerCase() : '';

        const activityPassesLogFilters = (a) => {
            if (!isValid(a)) return false;

            const effectiveIndoor = virtualRideChip ? 'indoor' : indoorFilter;
            const sportType = resolveActivityType(a);
            if (effectiveIndoor === 'indoor' && !['VirtualRide', 'VirtualRun'].includes(sportType)) return false;
            if (effectiveIndoor === 'outdoor' && ['VirtualRide', 'VirtualRun'].includes(sportType)) return false;

            if (gravelRideChip && sportType !== 'GravelRide') return false;
            if (mtbRideChip && sportType !== 'MountainBikeRide') return false;
            if (ebikeRideChip && sportType !== 'EBikeRide') return false;

            if (weekStartYmd && weekEndYmd) {
                const dStr = normalizeDate(a.date);
                if (!dStr || dStr.length < 10) return false;
                if (dStr < weekStartYmd || dStr > weekEndYmd) return false;
            }

            if (rollingStartYmd) {
                const dStr = normalizeDate(a.date);
                if (!dStr || dStr.length < 10) return false;
                if (dStr < rollingStartYmd) return false;
            }

            if (stravaLinkedOnly && !a.strava_id) return false;

            if (noPowerOnly) {
                const ap = Number(a.avg_power) || 0;
                const np = Number(a.norm_power) || 0;
                if (ap > 0 || np > 0) return false;
            }

            if (withPowerOnly) {
                const ap = Number(a.avg_power) || 0;
                const np = Number(a.norm_power) || 0;
                if (ap <= 0 && np <= 0) return false;
            }

            if (highLoadOnly && !((Number(a.load) || 0) > 120)) return false;

            if (longRideOnly && !((Number(a.distance) || 0) > 100)) return false;

            if (missingHrOnly && (Number(a.avg_hr) || 0) > 0) return false;

            if (tssOk && !((Number(a.load) || 0) > tssThreshold)) return false;

            if (anyMetric) {
                let distKm, timeSec;
                if (needDist || needSpeed) {
                    distKm = activityDistanceKm(a);
                    if (needDist && !inNumericRange(distKm, dMin, dMax, { requireValue: true })) return false;
                }

                if (needSpeed || needDur) {
                    timeSec = activityMovingTimeSec(a);
                }

                if (needSpeed) {
                    const speedKmh = activityAvgSpeedKmh(a, distKm, timeSec);
                    if (!inNumericRange(speedKmh, spMin, spMax, { requireValue: true })) return false;
                }

                if (needDur) {
                    const durMinVal = timeSec != null ? timeSec / 60 : null;
                    if (!inNumericRange(durMinVal, durMin, durMax, { requireValue: true })) return false;
                }

                if (needPower) {
                    const powerVal = (() => {
                        const ap = Number(a.avg_power) || 0;
                        const np = Number(a.norm_power) || 0;
                        return ap > 0 ? ap : np > 0 ? np : null;
                    })();
                    if (!inNumericRange(powerVal, pwMin, pwMax, { requireValue: true })) return false;
                }

                if (needElev) {
                    const elev = Number(a.climbing);
                    const elevVal = !Number.isNaN(elev) && elev > 0 ? elev : null;
                    if (!inNumericRange(elevVal, elMin, elMax, { requireValue: true })) return false;
                }

                if (needKj) {
                    const kj = Number(a.work);
                    const kjVal = !Number.isNaN(kj) && kj > 0 ? kj : null;
                    if (!inNumericRange(kjVal, kjMin, kjMax, { requireValue: true })) return false;
                }

                if (needDec && !activityMatchesDriftRange(a, 'decoupling_pct', decMin, decMax)) return false;
                if (needThr && !activityMatchesDriftRange(a, 'threshold_drift_pct', thrMin, thrMax)) return false;
                if (needRace && !activityMatchesDriftRange(a, 'race_drift_pct', raceMin, raceMax)) return false;
            }

            if (!activityMatchesLogSearch(a, searchLower)) return false;

            return true;
        };

        const forGearOptions = [];
        const filtered = [];
        for (const a of activities) {
            if (!activityPassesLogFilters(a)) continue;
            forGearOptions.push(a);
            if (filterGearId) {
                const ag = a.gear_id != null ? String(a.gear_id).trim() : '';
                if (ag !== filterGearId) continue;
            }
            filtered.push(a);
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => compareActivitiesForSort(a, b, sortConfig, profileFtp));
        }
        return { processedActivities: filtered, activitiesForGearFilterOptions: forGearOptions };
    }, [activities, search, sortConfig, profileFtp, indoorFilter, virtualRideChip, gravelRideChip, mtbRideChip, ebikeRideChip, thisWeekOnly, rollingDays, stravaLinkedOnly, noPowerOnly, withPowerOnly, highLoadOnly, longRideOnly, missingHrOnly, minTss, filterGearId, filterDistMin, filterDistMax, filterSpeedMin, filterSpeedMax, filterPowerMin, filterPowerMax, filterDurMinMin, filterDurMaxMin, filterElevMin, filterElevMax, filterKjMin, filterKjMax, filterDecMin, filterDecMax, filterThrMin, filterThrMax, filterRaceMin, filterRaceMax]);

    const gearFilterOptions = useMemo(() => {
        const base = buildGearFilterOptionsFromActivities(activitiesForGearFilterOptions);
        if (!filterGearId) return base;
        const active = (activities || []).find((a) => String(a?.gear_id || '').trim() === filterGearId);
        const name = active?.gear_name != null ? String(active.gear_name).trim() : '';
        return mergeActiveGearFilterOption(base, filterGearId, name);
    }, [activitiesForGearFilterOptions, filterGearId, activities]);

    const isGroupedView = sortConfig.key === 'date';

    const groupedActivities = useMemo(() => {
        if (!isGroupedView) return null;
        const groups = {};

        processedActivities.forEach(act => {
            try {
                // ⚡ Bolt Optimization: Use regex for ISO dates to avoid expensive new Date() allocations in loops
                const ymdMatch = String(act.date).match(/^(\d{4})-(\d{2})-(\d{2})/);
                let y, mIndex;
                if (ymdMatch) {
                    y = ymdMatch[1];
                    mIndex = parseInt(ymdMatch[2], 10) - 1;
                } else {
                    const d = new Date(act.date);
                    if (Number.isNaN(d.getTime())) return;
                    y = String(d.getFullYear());
                    mIndex = d.getMonth();
                }
                const m = MONTH_ORDER[mIndex];
                if (!groups[y]) groups[y] = {};
                if (!groups[y][m]) groups[y][m] = [];
                groups[y][m].push(act);
            } catch {
                /* skip bad row */
            }
        });

        return groups;
    }, [processedActivities, isGroupedView]);

    /** Alle zichtbare jaar/maand-groepen open (na quick filters: alleen gefilterde takken). */
    const expandAllGrouped = useCallback(() => {
        if (!groupedActivities) return;
        const initialY = {};
        const initialM = {};
        Object.keys(groupedActivities).forEach((year) => {
            initialY[year] = true;
            Object.keys(groupedActivities[year] || {}).forEach((month) => {
                initialM[`${year}-${month}`] = true;
            });
        });
        setExpandedYears(initialY);
        setExpandedMonths(initialM);
    }, [groupedActivities]);

    const collapseAllGrouped = useCallback(() => {
        if (!groupedActivities) {
            setExpandedYears({});
            setExpandedMonths({});
            return;
        }
        const initialM = {};
        Object.keys(groupedActivities).forEach((year) => {
            Object.keys(groupedActivities[year] || {}).forEach((month) => {
                initialM[`${year}-${month}`] = false;
            });
        });
        setExpandedYears({});
        setExpandedMonths(initialM);
    }, [groupedActivities]);

    // Auto-expand last 6 ACTIVE months only ONCE when data first arrives or when grouping changes
    useEffect(() => {
        if (!groupedActivities) return;

        // Decouple from render cycle to avoid cascading render warnings
        const timer = setTimeout(() => {
            setExpandedYears(prev => {
                if (prev !== null) return prev;

                const initialY = {};
                const initialM = {};

                // Extract all absolute month strings present
                const activeMonthKeys = [];
                Object.keys(groupedActivities).sort((a, b) => b - a).forEach(y => {
                    Object.keys(groupedActivities[y]).sort((a, b) => MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a)).forEach(m => {
                        activeMonthKeys.push({ year: y, month: m });
                    });
                });

                if (activeMonthKeys.length > 0) {
                    // Take top 6
                    const top6 = activeMonthKeys.slice(0, 6);
                    top6.forEach(({ year, month }) => {
                        initialY[year] = true;
                        initialM[`${year}-${month}`] = true;
                    });

                    // Set secondary state
                    setExpandedMonths(initialM);
                }

                return initialY;
            });
        }, 10);

        return () => clearTimeout(timer);
    }, [groupedActivities]);

    const [activeMetricPresetIds, setActiveMetricPresetIds] = useState([]);

    const applyMetricFilterState = useCallback((state) => {
        setFilterDistMin(state.filterDistMin ?? '');
        setFilterDistMax(state.filterDistMax ?? '');
        setFilterSpeedMin(state.filterSpeedMin ?? '');
        setFilterSpeedMax(state.filterSpeedMax ?? '');
        setFilterPowerMin(state.filterPowerMin ?? '');
        setFilterPowerMax(state.filterPowerMax ?? '');
        setFilterDurMinMin(state.filterDurMinMin ?? '');
        setFilterDurMaxMin(state.filterDurMaxMin ?? '');
        setFilterElevMin(state.filterElevMin ?? '');
        setFilterElevMax(state.filterElevMax ?? '');
        setFilterKjMin(state.filterKjMin ?? '');
        setFilterKjMax(state.filterKjMax ?? '');
        setFilterDecMin(state.filterDecMin ?? '');
        setFilterDecMax(state.filterDecMax ?? '');
        setFilterThrMin(state.filterThrMin ?? '');
        setFilterThrMax(state.filterThrMax ?? '');
        setFilterRaceMin(state.filterRaceMin ?? '');
        setFilterRaceMax(state.filterRaceMax ?? '');
    }, []);

    const clearMetricFilters = useCallback(() => {
        applyMetricFilterState(createEmptyMetricFilterState());
        setActiveMetricPresetIds([]);
    }, [applyMetricFilterState]);

    const clearActiveMetricPresets = useCallback(() => {
        setActiveMetricPresetIds([]);
    }, []);

    const toggleMetricPreset = useCallback((presetId) => {
        setActiveMetricPresetIds((prev) => {
            const next = toggleMetricPresetIds(prev, presetId);
            applyMetricFilterState(mergePresetsToFilterState(next));
            return next;
        });
    }, [applyMetricFilterState]);

    const applyLogFilterPreset = useCallback((presetId) => {
        const chips = chipStateForPreset(presetId || 'all');
        setIndoorFilter(chips.indoorFilter);
        setVirtualRideChip(chips.virtualRideChip);
        setGravelRideChip(chips.gravelRideChip);
        setMtbRideChip(chips.mtbRideChip);
        setEbikeRideChip(chips.ebikeRideChip);
        setThisWeekOnly(chips.thisWeekOnly);
        setRollingDays(chips.rollingDays);
        setStravaLinkedOnly(chips.stravaLinkedOnly);
        setNoPowerOnly(chips.noPowerOnly);
        setWithPowerOnly(chips.withPowerOnly);
        setHighLoadOnly(chips.highLoadOnly);
        setLongRideOnly(chips.longRideOnly);
        setMissingHrOnly(chips.missingHrOnly);
        setMinTss(chips.minTss);
        const id = presetId || 'all';
        setActiveLogFilterPresetId(id);
        safeLocalStorageSet(ACTIVITY_LOG_FILTER_PRESET_STORAGE_KEY, id);
    }, []);

    const resetLogFilters = useCallback(() => {
        applyLogFilterPreset('all');
        setSearch('');
        setFilterGearId('');
        clearMetricFilters();
    }, [applyLogFilterPreset, clearMetricFilters]);

    const detectedLogFilterPresetId = useMemo(() => detectActiveLogFilterPreset({
        indoorFilter,
        virtualRideChip,
        gravelRideChip,
        mtbRideChip,
        ebikeRideChip,
        thisWeekOnly,
        rollingDays,
        stravaLinkedOnly,
        noPowerOnly,
        withPowerOnly,
        highLoadOnly,
        longRideOnly,
        missingHrOnly,
        minTss,
    }), [
        indoorFilter,
        virtualRideChip,
        gravelRideChip,
        mtbRideChip,
        ebikeRideChip,
        thisWeekOnly,
        rollingDays,
        stravaLinkedOnly,
        noPowerOnly,
        withPowerOnly,
        highLoadOnly,
        longRideOnly,
        missingHrOnly,
        minTss,
    ]);

    const filterByGearId = useCallback((gearId) => {
        const id = gearId != null ? String(gearId).trim() : '';
        if (!id) return;
        setFilterGearId(id);
    }, []);

    return {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear, ensureYearExpanded,
        isMonthExpanded, toggleMonth, ensureMonthExpanded,
        openGroupedPathForActivity,
        expandAllGrouped,
        collapseAllGrouped,
        processedActivities,
        groupedActivities,
        isGroupedView,
        thisWeekOnly, setThisWeekOnly,
        rollingDays, setRollingDays,
        stravaLinkedOnly, setStravaLinkedOnly,
        noPowerOnly, setNoPowerOnly,
        withPowerOnly, setWithPowerOnly,
        highLoadOnly, setHighLoadOnly,
        longRideOnly, setLongRideOnly,
        missingHrOnly, setMissingHrOnly,
        virtualRideChip, setVirtualRideChip,
        gravelRideChip, setGravelRideChip,
        mtbRideChip, setMtbRideChip,
        ebikeRideChip, setEbikeRideChip,
        minTss, setMinTss,
        filterDistMin, setFilterDistMin,
        filterDistMax, setFilterDistMax,
        filterSpeedMin, setFilterSpeedMin,
        filterSpeedMax, setFilterSpeedMax,
        filterPowerMin, setFilterPowerMin,
        filterPowerMax, setFilterPowerMax,
        filterDurMinMin, setFilterDurMinMin,
        filterDurMaxMin, setFilterDurMaxMin,
        filterElevMin, setFilterElevMin,
        filterElevMax, setFilterElevMax,
        filterKjMin, setFilterKjMin,
        filterKjMax, setFilterKjMax,
        filterDecMin, setFilterDecMin,
        filterDecMax, setFilterDecMax,
        filterThrMin, setFilterThrMin,
        filterThrMax, setFilterThrMax,
        filterRaceMin, setFilterRaceMin,
        filterRaceMax, setFilterRaceMax,
        filterGearId, setFilterGearId,
        gearFilterOptions,
        clearMetricFilters,
        activeMetricPresetIds,
        toggleMetricPreset,
        clearActiveMetricPresets,
        applyLogFilterPreset,
        resetLogFilters,
        activeLogFilterPresetId,
        detectedLogFilterPresetId,
        logFilterPresets: BUILTIN_ACTIVITY_LOG_FILTER_PRESETS,
        filterByGearId,
    };
};

export default useActivityFilter;

