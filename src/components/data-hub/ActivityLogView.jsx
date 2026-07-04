import React from 'react';
import useMediaQuery, { MOBILE_CARD_LAYOUT_MQ } from '../../hooks/useMediaQuery';
import ActivityTable from './ActivityTable';
import ActivityCardList from './ActivityCardList';

/**
 * Responsive Activity Log: table on md+ screens, cards on mobile.
 */
const ActivityLogView = (props) => {
    const useCardLayout = useMediaQuery(MOBILE_CARD_LAYOUT_MQ);
    if (useCardLayout) return <ActivityCardList {...props} />;
    return <ActivityTable {...props} />;
};

export default ActivityLogView;
