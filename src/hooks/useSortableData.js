import { useState, useMemo } from 'react';
import { compareActivitiesForSort } from '../utils/activitySort';

const useSortableData = (items, config = null) => {
    const [sortConfig, setSortConfig] = useState(config);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => compareActivitiesForSort(a, b, sortConfig));
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
