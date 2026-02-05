import { useState, useMemo } from 'react';

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle string comparison (case-insensitive)
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal ? bVal.toLowerCase() : '';
                } else {
                    // Handle numeric comparison
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                }

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; // Default to descending for most recent first usually, or based on previous
        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === 'desc'
        ) {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

export default useSortableData;
