import React from 'react';
import { Monitor, Bike, Footprints, Mountain } from 'lucide-react';
import GravelRideIcon from './icons/GravelRideIcon';

import MtbRideIcon from './icons/MtbRideIcon';

const TYPE_CONFIG = {
    VirtualRide: { kind: 'lucide', Icon: Monitor, className: 'text-orange-400', title: 'Virtual Ride' },
    GravelRide: { kind: 'custom', Icon: GravelRideIcon, className: 'text-fuchsia-500', title: 'Gravel Ride' },
    MountainBikeRide: { kind: 'custom', Icon: MtbRideIcon, className: 'text-lime-400', title: 'Mountain Bike Ride' },
    EBikeRide: { kind: 'lucide', Icon: Bike, className: 'text-cyan-400', title: 'E-Bike Ride' },
    Run: { kind: 'lucide', Icon: Footprints, className: 'text-blue-400', title: 'Run' },
    Walk: { kind: 'lucide', Icon: Footprints, className: 'text-green-300', title: 'Walk' },
    Hike: { kind: 'lucide', Icon: Mountain, className: 'text-green-500', title: 'Hike' },
};

const ActivityTypeIcon = ({ type, size = 16, className = '' }) => {
    const cfg = TYPE_CONFIG[type] || { kind: 'lucide', Icon: Bike, className: 'text-green-400', title: type || 'Ride' };
    const { Icon, className: colorClass, title } = cfg;
    const merged = `shrink-0 ${colorClass} ${className}`.trim();

    if (cfg.kind === 'custom') {
        return <Icon size={size} className={merged} title={title} />;
    }

    return <Icon size={size} className={merged} title={title} aria-hidden />;
};

export default ActivityTypeIcon;
