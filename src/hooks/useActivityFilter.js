import { useState, useMemo, useCallback } from 'react';

import { MONTH_ORDER } from '../config';

// Helper inside hook or import
const isValid = (act) => act && act.id && act.date;

const useActivityFilter = (activities) => {
    const [search, setSearch] = useState("");
    const [indoorFilter, setIndoorFilter] = useState('all'); // 'all', 'indoor', 'outdoor'
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // We store explicit collapse state.
    const [expandedYears, setExpandedYears] = useState(null);
    const [expandedMonths, setExpandedMonths] = useState(null);

    // -- Actions --
    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    }, []);

    const toggleYear = useCallback((year) => {
        setExpandedYears(p => ({ ...p, [year]: !p[year] }));
    }, []);

    const toggleMonth = useCallback((year, month) => {
        const key = `${year}-${month}`;
        setExpandedMonths(p => ({ ...p, [key]: !p[key] }));
    }, []);

    // Checkers - Note: Default is now false because we prepopulate true keys!
    const isYearExpanded = useCallback((year) => expandedYears?.[year] === true, [expandedYears]);
    const isMonthExpanded = useCallback((year, month) => expandedMonths?.[`${year}-${month}`] === true, [expandedMonths]);

    // -- Derived State --
    const processedActivities = useMemo(() => {
        if (!activities) return [];
        let filtered = activities.filter(a => {
            if (!isValid(a)) return false;

            // Indoor/Outdoor Filter
            if (indoorFilter === 'indoor' && !['VirtualRide', 'VirtualRun'].includes(a.type)) return false;
            if (indoorFilter === 'outdoor' && ['VirtualRide', 'VirtualRun'].includes(a.type)) return false;

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
                } catch (e) { }
            }
            return false;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal ? bVal.toLowerCase() : ''; }
                else { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [activities, search, sortConfig, indoorFilter]);

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
            } catch (e) { }
        });

        // Auto-expand last 6 ACTIVE months if not already defined
        if (expandedYears === null && expandedMonths === null && Object.keys(groups).length > 0) {
            const initialY = {};
            const initialM = {};

            // Extract all absolute month strings present
            const activeMonthKeys = [];
            Object.keys(groups).sort((a, b) => b - a).forEach(y => {
                Object.keys(groups[y]).sort((a, b) => MONTH_ORDER.indexOf(b) - MONTH_ORDER.indexOf(a)).forEach(m => {
                    activeMonthKeys.push({ year: y, month: m });
                });
            });

            // Take top 6
            const top6 = activeMonthKeys.slice(0, 6);
            top6.forEach(({ year, month }) => {
                initialY[year] = true;
                initialM[`${year}-${month}`] = true;
            });

            // We set state directly inside useMemo (anti-pattern) or useEffect?
            // Safer to do it via timeout to avoid React warnings during render phase
            setTimeout(() => {
                setExpandedYears(prev => prev || initialY);
                setExpandedMonths(prev => prev || initialM);
            }, 0);
        }

        return groups;
    }, [processedActivities, isGroupedView, expandedYears, expandedMonths]);

    return {
        search, setSearch,
        indoorFilter, setIndoorFilter,
        sortConfig, requestSort,
        isYearExpanded, toggleYear,
        isMonthExpanded, toggleMonth,
        processedActivities,
        groupedActivities,
        isGroupedView
    };
};

export default useActivityFilter;

