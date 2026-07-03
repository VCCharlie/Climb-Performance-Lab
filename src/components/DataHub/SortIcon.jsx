import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

const SortIcon = ({ colKey, config }) => {
    if (config.key !== colKey) return <ArrowUpDown size={12} className="opacity-30 ml-1 inline" />;
    return config.direction === 'asc' ? <ChevronUp size={12} className="text-cdprimary ml-1 inline" /> : <ChevronDown size={12} className="text-cdprimary ml-1 inline" />;
};

export default SortIcon;
