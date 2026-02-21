import React from 'react';
import { ACTIVITY_COLUMNS } from '../../config';
import SortIcon from './SortIcon';

const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false }) => (
    <thead className="bg-cdbg text-cdmuted uppercase font-bold sticky top-0 z-10 shadow-md text-[0.7rem] tracking-wider">
        <tr>
            {isPreview && <th className="p-3 w-10"></th>}
            {ACTIVITY_COLUMNS.map((col) => (
                <th key={col.key} className={`p-3 cursor-pointer hover:bg-cdsurface transition-colors select-none text-${col.align} ${col.width || ''}`} onClick={() => requestSort && requestSort(col.key)}>
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        {col.align === 'left' && <span>{col.label}</span>}
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                        {col.align !== 'left' && <span>{col.label}</span>}
                    </span>
                </th>
            ))}
            {hasActions && <th className="p-3 text-right">Action</th>}
        </tr>
    </thead>
);

export default TableHeader;
