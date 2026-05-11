import { useState, useMemo, useCallback, useEffect } from 'react';

import { MONTH_ORDER } from '../config';
import {
    activityDistanceKm,
    activityMovingTimeSec,
    activityAvgSpeedKmh,
    activityIntensityFactor,
    parseNumericBound,
    inNumericRange,
} from '../utils/activityFilterMetrics';

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

function parseActivityDate(a) {
    if (!a?.date) return null;
    try {
        const d = new Date(a.date);
        return Number.isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
}

const useActivityFilter = (activities, profileFtp) => {
    const [search, setSearch] = useState("");
    const [indoorFilter, setIndoorFilter] = useState('all'); // 'all', 'indoor', 'outdoor'
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    /** Quick chips */
    const [thisWeekOnly, setThisWeekOnly] = useState(false);
    const [rollingDays, setRollingDays] = useState(null); // null | 7 | 14 | 30
    const [stravaLinkedOnly, setStravaLinkedOnly] = useState(false);
    const [noPowerOnly, setNoPowerOnly] = useState(false);
    const [withPowerOnly, setWithPowerOnly] = useState(false);
    const [highLoadOnly, setHighLoadOnly] = useState(false);
    const [longRideOnly, setLongRideOnly] = useState(false);
    const [missingHrOnly, setMissingHrOnly] = useState(false);
    const [virtualRideChip, setVirtualRideChip] = useState(false);
    const [minTss, setMinTss] = useState('');

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

    /** Expand year/month so a grouped row exists in the DOM (e.g. Dashboard deep-link). */
    const openGroupedPathForActivity = useCallback((activity) => {
        if (!activity?.date) return;
        try {
            const d = new Date(activity.date);
            if (Number.isNaN(d.getTime())) return;
            const y = String(d.getFullYear());
            const m = MONTH_ORDER[d.getMonth()];
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
    const processedActivities = useMemo(() => {
        if (!activities) return [];
        const weekRange = thisWeekOnly ? getThisCalendarWeekRange() : null;
        const rollingStart = rollingDays != null && rollingDays > 0
            ? (() => { const s = startOfToday(); s.setDate(s.getDate() - rollingDays); return s; })()
            : null;
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

        const anyMetric =
            dMin != null || dMax != null
            || spMin != null || spMax != null
            || pwMin != null || pwMax != null
            || durMin != null || durMax != null
            || elMin != null || elMax != null
            || kjMin != null || kjMax != null;

        let filtered = activities.filter(a => {
            if (!isValid(a)) return false;

            // Indoor/Outdoor Filter
            const effectiveIndoor = virtualRideChip ? 'indoor' : indoorFilter;
            if (effectiveIndoor === 'indoor' && !['VirtualRide', 'VirtualRun'].includes(a.type)) return false;
            if (effectiveIndoor === 'outdoor' && ['VirtualRide', 'VirtualRun'].includes(a.type)) return false;

            if (thisWeekOnly && weekRange) {
                const ad = parseActivityDate(a);
                if (!ad || ad < weekRange.start || ad > weekRange.end) return false;
            }

            if (rollingStart) {
                const ad = parseActivityDate(a);
                if (!ad || ad < rollingStart) return false;
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

            if (filterGearId) {
                const ag = a.gear_id != null ? String(a.gear_id).trim() : '';
                if (ag !== filterGearId) return false;
            }

            if (anyMetric) {
                const distKm = activityDistanceKm(a);
                const timeSec = activityMovingTimeSec(a);
                const speedKmh = activityAvgSpeedKmh(a, distKm, timeSec);
                const durMinVal = timeSec != null ? timeSec / 60 : null;
                const powerVal = (() => {
                    const ap = Number(a.avg_power) || 0;
                    const np = Number(a.norm_power) || 0;
                    return ap > 0 ? ap : np > 0 ? np : null;
                })();
                const elev = Number(a.climbing);
                const elevVal = !Number.isNaN(elev) && elev > 0 ? elev : null;
                const kj = Number(a.work);
                const kjVal = !Number.isNaN(kj) && kj > 0 ? kj : null;

                const needDist = dMin != null || dMax != null;
                const needSpeed = spMin != null || spMax != null;
                const needDur = durMin != null || durMax != null;
                const needPower = pwMin != null || pwMax != null;
                const needElev = elMin != null || elMax != null;
                const needKj = kjMin != null || kjMax != null;

                if (needDist && !inNumericRange(distKm, dMin, dMax, { requireValue: true })) return false;
                if (needSpeed && !inNumericRange(speedKmh, spMin, spMax, { requireValue: true })) return false;
                if (needDur && !inNumericRange(durMinVal, durMin, durMax, { requireValue: true })) return false;
                if (needPower && !inNumericRange(powerVal, pwMin, pwMax, { requireValue: true })) return false;
                if (needElev && !inNumericRange(elevVal, elMin, elMax, { requireValue: true })) return false;
                if (needKj && !inNumericRange(kjVal, kjMin, kjMax, { requireValue: true })) return false;
            }

            // Search
            const searchLower = search.toLowerCase();
            if (!searchLower) return true;

            // 1. Title Match
            if (a.title && a.title.toLowerCase().includes(searchLower)) return true;

            // 2. Date Match
            if (a.date) {
                if (a.date.includes(searchLower)) return true;

                try {
                    const d = new Date(a.date);
                    const day = d.getDate();
                    const month = d.getMonth() + 1;
                    const year = d.getFullYear();
                    const dmy = `${day}-${month}-${year}`;
                    const ddmm = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
                    if (dmy.includes(searchLower) || ddmm.includes(searchLower)) return true;
                } catch {
                    /* invalid date */
                }
            }
            return false;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (sortConfig.key === 'intensity_factor') {
                    const fa = activityIntensityFactor(a.norm_power, profileFtp);
                    const fb = activityIntensityFactor(b.norm_power, profileFtp);
                    const nullSentinel = sortConfig.direction === 'desc' ? -Infinity : Infinity;
                    const aNum = fa != null ? fa : nullSentinel;
                    const bNum = fb != null ? fb : nullSentinel;
                    if (aNum < bNum) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aNum > bNum) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Robust comparison from useSortableData
                if (typeof aVal === 'string' || typeof bVal === 'string') {
                    const aStr = String(aVal || '').toLowerCase();
                    const bStr = String(bVal || '').toLowerCase();
                    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                } else {
                    const aNum = Number(aVal) || 0;
                    const bNum = Number(bVal) || 0;
                    if (aNum < bNum) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aNum > bNum) return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [activities, search, sortConfig, profileFtp, indoorFilter, virtualRideChip, thisWeekOnly, rollingDays, stravaLinkedOnly, noPowerOnly, withPowerOnly, highLoadOnly, longRideOnly, missingHrOnly, minTss, filterGearId, filterDistMin, filterDistMax, filterSpeedMin, filterSpeedMax, filterPowerMin, filterPowerMax, filterDurMinMin, filterDurMaxMin, filterElevMin, filterElevMax, filterKjMin, filterKjMax]);

    const isGroupedView = sortConfig.key === 'date';

    const groupedActivities = useMemo(() => {
        if (!isGroupedView) return null;
        const groups = {};

        processedActivities.forEach(act => {
            try {
                const d = new Date(act.date);
                const y = d.getFullYear();
                const m = MONTH_ORDER[d.getMonth()];
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

    const clearMetricFilters = useCallback(() => {
        setFilterDistMin('');
        setFilterDistMax('');
        setFilterSpeedMin('');
        setFilterSpeedMax('');
        setFilterPowerMin('');
        setFilterPowerMax('');
        setFilterDurMinMin('');
        setFilterDurMaxMin('');
        setFilterElevMin('');
        setFilterElevMax('');
        setFilterKjMin('');
        setFilterKjMax('');
    }, []);

    return {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
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
        filterGearId, setFilterGearId,
        clearMetricFilters,
    };
};

export default useActivityFilter;

