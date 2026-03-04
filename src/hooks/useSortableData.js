import { useState, useMemo } from 'react';

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Robust comparison handling mixed types and nulls
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
