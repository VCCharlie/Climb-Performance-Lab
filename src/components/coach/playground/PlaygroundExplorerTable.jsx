import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../../utils/formatters.js';
import useMediaQuery from '../../../hooks/useMediaQuery.js';
import PlaygroundPeriodTable from './PlaygroundPeriodTable.jsx';
import {
    playgroundTdMonoClass,
    playgroundTdMutedClass,
    playgroundTdTextClass,
    playgroundThClass,
    playgroundExplorerSortKeys,
    shortPlaygroundHeader,
} from '../../../utils/playgroundTableStyles.js';

const SORT_KEYS = playgroundExplorerSortKeys;

function SortHeader({ label, shortLabel, sortKey, activeKey, direction, onSort, className }) {
    const active = activeKey === sortKey;
    const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    const showShort = shortLabel && shortLabel !== label;

    return (
        <th className={className ?? playgroundThClass}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-0.5 sm:gap-1 uppercase font-semibold leading-tight max-w-full ${active ? 'text-cdaccent' : 'text-cdmuted hover:text-cdtext'}`}
            >
                {showShort ? (
                    <>
                        <span className="sm:hidden truncate" title={label}>{shortLabel}</span>
                        <span className="hidden sm:inline truncate">{label}</span>
                    </>
                ) : (
                    <span className="truncate">{label}</span>
                )}
                <Icon size={12} className="shrink-0" />
            </button>
        </th>
    );
}

function RideLabelCell({ row, isRideMode }) {
    if (!isRideMode) {
        return (
            <span className="block truncate" title={row.label}>
                {row.label}
            </span>
        );
    }

    const title = row.label || 'Ride';
    const dateLabel = row.dateYmd ? formatDateDDMMYYYY(row.dateYmd) : null;

    return (
        <div className="min-w-0">
            {dateLabel && (
                <span className="block text-[10px] text-cdmuted tabular-nums leading-tight truncate" title={dateLabel}>
                    {dateLabel}
                </span>
            )}
            <span className="block truncate text-cdtext leading-snug" title={title}>
                {title}
            </span>
        </div>
    );
}

function MetricValue({ value }) {
    return <span className="tabular-nums">{value ?? '—'}</span>;
}

function ExplorerRideCards({ rows, xMeta, yMeta, colorMeta }) {
    const xShort = shortPlaygroundHeader(xMeta.label);
    const yShort = shortPlaygroundHeader(yMeta.label);
    const colorShort = colorMeta ? shortPlaygroundHeader(colorMeta.label) : null;

    if (!rows.length) {
        return (
            <p className="rounded-lg border border-cdborder px-3 py-4 text-xs text-cdmuted">
                No rides match the current filters.
            </p>
        );
    }

    return (
        <ul className="space-y-2">
            {rows.map((row) => (
                <li
                    key={row.key}
                    className="rounded-lg border border-cdborder bg-cdborder/10 px-3 py-2.5"
                >
                    <RideLabelCell row={row} isRideMode />
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        <div className="min-w-0">
                            <dt className="text-[10px] uppercase tracking-wide text-cdmuted truncate" title={xMeta.label}>
                                {xShort}
                            </dt>
                            <dd className="text-cdtext">
                                <MetricValue value={row.x} />
                            </dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-[10px] uppercase tracking-wide text-cdmuted truncate" title={yMeta.label}>
                                {yShort}
                            </dt>
                            <dd className="text-cdtext">
                                <MetricValue value={row.y} />
                            </dd>
                        </div>
                        {colorMeta && (
                            <div className="col-span-2 min-w-0">
                                <dt className="text-[10px] uppercase tracking-wide text-cdmuted truncate" title={colorMeta.label}>
                                    {colorShort}
                                </dt>
                                <dd className="text-cdmuted">
                                    <MetricValue value={row.color} />
                                </dd>
                            </div>
                        )}
                    </dl>
                </li>
            ))}
        </ul>
    );
}

function ExplorerDataTable({
    rows,
    xMeta,
    yMeta,
    colorMeta,
    isRideMode,
    sortKey,
    sortDir,
    onSort,
}) {
    const periodLabel = isRideMode ? 'Ride' : 'Period';
    const showRideCount = !isRideMode;

    return (
        <PlaygroundPeriodTable>
            <colgroup>
                <col className={isRideMode ? 'w-[34%]' : 'w-[22%]'} />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                {colorMeta && <col className="w-[16%]" />}
                {showRideCount && <col className="w-[10%]" />}
            </colgroup>
            <thead>
                <tr className="bg-cdborder/40">
                    <SortHeader
                        label={periodLabel}
                        sortKey={SORT_KEYS.label}
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={onSort}
                        className={`${playgroundThClass} ${isRideMode ? 'w-[34%]' : 'w-[22%]'}`}
                    />
                    <SortHeader
                        label={xMeta.label}
                        shortLabel={shortPlaygroundHeader(xMeta.label)}
                        sortKey={SORT_KEYS.x}
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={onSort}
                        className={`${playgroundThClass} w-[18%]`}
                    />
                    <SortHeader
                        label={yMeta.label}
                        shortLabel={shortPlaygroundHeader(yMeta.label)}
                        sortKey={SORT_KEYS.y}
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={onSort}
                        className={`${playgroundThClass} w-[18%]`}
                    />
                    {colorMeta && (
                        <SortHeader
                            label={colorMeta.label}
                            shortLabel={shortPlaygroundHeader(colorMeta.label)}
                            sortKey={SORT_KEYS.color}
                            activeKey={sortKey}
                            direction={sortDir}
                            onSort={onSort}
                            className={`${playgroundThClass} hidden sm:table-cell w-[16%]`}
                        />
                    )}
                    {showRideCount && (
                        <SortHeader
                            label="Rides"
                            sortKey={SORT_KEYS.rideCount}
                            activeKey={sortKey}
                            direction={sortDir}
                            onSort={onSort}
                            className={`${playgroundThClass} w-[10%]`}
                        />
                    )}
                </tr>
            </thead>
            <tbody className="text-cdtext">
                {rows.map((row) => (
                    <tr key={row.key} className="border-t border-cdborder">
                        <td className={playgroundTdTextClass}>
                            <RideLabelCell row={row} isRideMode={isRideMode} />
                        </td>
                        <td className={playgroundTdMonoClass}>{row.x ?? '—'}</td>
                        <td className={playgroundTdMonoClass}>{row.y ?? '—'}</td>
                        {colorMeta && (
                            <td className={`${playgroundTdMutedClass} hidden sm:table-cell`}>
                                {row.color ?? '—'}
                            </td>
                        )}
                        {showRideCount && (
                            <td className={playgroundTdMutedClass}>{row.rideCount}</td>
                        )}
                    </tr>
                ))}
            </tbody>
        </PlaygroundPeriodTable>
    );
}

export default function PlaygroundExplorerTable({
    rows,
    cadence,
    xMeta,
    yMeta,
    colorMeta,
    sortKey,
    sortDir,
    onSort,
}) {
    const isMobile = useMediaQuery('(max-width: 639px)');
    const isRideMode = cadence === 'ride';

    if (isMobile && isRideMode) {
        return (
            <ExplorerRideCards
                rows={rows}
                xMeta={xMeta}
                yMeta={yMeta}
                colorMeta={colorMeta}
            />
        );
    }

    return (
        <ExplorerDataTable
            rows={rows}
            xMeta={xMeta}
            yMeta={yMeta}
            colorMeta={colorMeta}
            isRideMode={isRideMode}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
        />
    );
}
