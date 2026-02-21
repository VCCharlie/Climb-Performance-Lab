import { useState, useMemo } from 'react';

// Helper inside hook or import
const isValid = (act) => act && act.id && act.date;

const useActivityFilter = (activities) => {
    const [search, setSearch] = useState("");
    const [indoorFilter, setIndoorFilter] = useState('all'); // 'all', 'indoor', 'outdoor'
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // We store explicit collapse state. If a key is not present, it is considered expanded (true)
    const [expandedYears, setExpandedYears] = useState({});
    const [expandedMonths, setExpandedMonths] = useState({});

    // -- Actions --
    const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc' });

    // Toggle year (default is true, so if undefined we set to false)
    const toggleYear = (year) => setExpandedYears(p => ({ ...p, [year]: p[year] === false ? true : false }));

    // Toggle month (default is true, so if undefined we set to false)
    const toggleMonth = (year, month) => {
        const key = `${year}-${month}`;
        setExpandedMonths(p => ({ ...p, [key]: p[key] === false ? true : false }));
    };

    // Checkers
    const isYearExpanded = (year) => expandedYears[year] !== false;
    const isMonthExpanded = (year, month) => expandedMonths[`${year}-${month}`] !== false;

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
        return groups;
    }, [processedActivities, isGroupedView]);

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
