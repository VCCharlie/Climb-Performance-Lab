import { useState, useMemo, useCallback, useEffect } from 'react';

import { MONTH_ORDER } from '../config';

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

const useActivityFilter = (activities) => {
    const [search, setSearch] = useState("");
    const [indoorFilter, setIndoorFilter] = useState('all'); // 'all', 'indoor', 'outdoor'
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    /** Quick chips: this week, Strava-linked, no power, min TSS */
    const [thisWeekOnly, setThisWeekOnly] = useState(false);
    const [stravaLinkedOnly, setStravaLinkedOnly] = useState(false);
    const [noPowerOnly, setNoPowerOnly] = useState(false);
    const [minTss, setMinTss] = useState('');

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
        const tssThreshold = minTss === '' || minTss == null ? null : Number(minTss);
        const tssOk = tssThreshold != null && !Number.isNaN(tssThreshold) && tssThreshold > 0;

        let filtered = activities.filter(a => {
            if (!isValid(a)) return false;

            // Indoor/Outdoor Filter
            if (indoorFilter === 'indoor' && !['VirtualRide', 'VirtualRun'].includes(a.type)) return false;
            if (indoorFilter === 'outdoor' && ['VirtualRide', 'VirtualRun'].includes(a.type)) return false;

            if (thisWeekOnly && weekRange) {
                try {
                    const ad = new Date(a.date);
                    if (Number.isNaN(ad.getTime()) || ad < weekRange.start || ad > weekRange.end) return false;
                } catch {
                    return false;
                }
            }

            if (stravaLinkedOnly && !a.strava_id) return false;

            if (noPowerOnly) {
                const ap = Number(a.avg_power) || 0;
                const np = Number(a.norm_power) || 0;
                if (ap > 0 || np > 0) return false;
            }

            if (tssOk && !((Number(a.load) || 0) > tssThreshold)) return false;

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
    }, [activities, search, sortConfig, indoorFilter, thisWeekOnly, stravaLinkedOnly, noPowerOnly, minTss]);

    const isGroupedView = sortConfig.key === 'date';

    const groupedActivities = useMemo(() => {
        if (!isGroupedView) return null;
        const groups = {};

        processedActivities.forEach(act => {
            try {
                const d = new Date(act.date);
                const y = d.getFullYear();
                const m = d.toLocaleString('en-US', { month: 'long' });
                if (!groups[y]) groups[y] = {};
                if (!groups[y][m]) groups[y][m] = [];
                groups[y][m].push(act);
            } catch {
                /* skip bad row */
            }
        });

        return groups;
    }, [processedActivities, isGroupedView]);

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

    return {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        processedActivities,
        groupedActivities,
        isGroupedView,
        thisWeekOnly, setThisWeekOnly,
        stravaLinkedOnly, setStravaLinkedOnly,
        noPowerOnly, setNoPowerOnly,
        minTss, setMinTss,
    };
};

export default useActivityFilter;

