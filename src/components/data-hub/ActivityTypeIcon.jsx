import React from 'react';
import { Monitor, Bike, Footprints, Mountain } from 'lucide-react';

const TYPE_CONFIG = {
    VirtualRide: { Icon: Monitor, className: 'text-orange-400', title: 'Virtual Ride' },
    GravelRide: { Icon: Bike, className: 'text-amber-400', title: 'Gravel Ride' },
    MountainBikeRide: { Icon: Bike, className: 'text-lime-400', title: 'Mountain Bike Ride' },
    EBikeRide: { Icon: Bike, className: 'text-cyan-400', title: 'E-Bike Ride' },
    Run: { Icon: Footprints, className: 'text-blue-400', title: 'Run' },
    Walk: { Icon: Footprints, className: 'text-green-300', title: 'Walk' },
    Hike: { Icon: Mountain, className: 'text-green-500', title: 'Hike' },
};

const ActivityTypeIcon = ({ type, size = 16, className = '' }) => {
    const cfg = TYPE_CONFIG[type] || { Icon: Bike, className: 'text-green-400', title: type || 'Ride' };
    const { Icon, className: colorClass, title } = cfg;
    return <Icon size={size} className={`shrink-0 ${colorClass} ${className}`.trim()} title={title} aria-hidden />;
};

export default ActivityTypeIcon;
