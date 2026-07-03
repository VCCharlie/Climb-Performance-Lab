import React from 'react';
import { ACTIVITY_TABLE_COLUMNS } from '../../config';
import SortIcon from './SortIcon';
import { tableHeadClass, tableHeadCellClass } from '../ui/tableStyles';

const TableHeader = ({ config, requestSort, hasActions = true, isPreview = false }) => (
    <thead className={tableHeadClass}>
        <tr>
            {isPreview && <th className={`${tableHeadCellClass} w-10`} />}
            {ACTIVITY_TABLE_COLUMNS.map((col) => (
                <th
                    key={col.key}
                    className={`${tableHeadCellClass} text-${col.align} ${col.width || ''}`}
                    onClick={() => requestSort && requestSort(col.key)}
                >
                    <span className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <span>{col.label}</span>
                        {requestSort && <SortIcon colKey={col.key} config={config} />}
                    </span>
                </th>
            ))}
            {hasActions && <th className={`${tableHeadCellClass} text-right`}>Action</th>}
        </tr>
    </thead>
);

export default TableHeader;
