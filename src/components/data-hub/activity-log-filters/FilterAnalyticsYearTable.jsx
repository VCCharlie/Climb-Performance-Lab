import React, { useMemo } from 'react';
import { buildYearTableColumns } from '../../../utils/filterAnalyticsYearTable';

/**
 * Configurable Volume-by-year table driven by the metrics column picker.
 */
export default function FilterAnalyticsYearTable({
    rows = [],
    visibleColumnKeys = [],
    className = '',
    compact = false,
}) {
    const columns = useMemo(
        () => buildYearTableColumns(visibleColumnKeys, rows),
        [visibleColumnKeys, rows],
    );

    if (!rows.length) return null;

    const cellClass = compact
        ? 'py-1 pr-3 tabular-nums'
        : 'py-1.5 pr-3 tabular-nums';
    const headClass = compact
        ? 'py-1 pr-3 font-semibold tabular-nums'
        : 'py-1 pr-3 font-semibold tabular-nums';

    return (
        <div className={`overflow-x-auto ${className}`.trim()}>
            <table className="w-full min-w-[20rem] text-[11px]">
                <thead>
                    <tr className="text-left text-cdmuted border-b border-cdborder/40">
                        <th scope="col" className={`${headClass} text-cdmuted`}>Year</th>
                        {columns.map((col) => (
                            <th key={col.key} scope="col" className={headClass}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.year}
                            className="border-b border-cdborder/20 last:border-0 text-cdtext"
                        >
                            <th scope="row" className={`${cellClass} font-bold text-cdtext`}>
                                {row.year}
                            </th>
                            {columns.map((col) => (
                                <td key={col.key} className={cellClass}>
                                    {col.getValue(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {columns.length === 0 ? (
                <p className="text-[10px] text-cdmuted mt-2">
                    No table columns selected. Use the column picker to choose metrics.
                </p>
            ) : null}
        </div>
    );
}
