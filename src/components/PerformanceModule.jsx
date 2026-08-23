import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { Activity, TrendingUp, Zap, Calendar, ArrowUp, ArrowDown, ExternalLink, ListTree } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils';
import { ChartTooltip } from './ui';
import { getChartTheme, chartCardClassLg } from '../utils/chartTheme';
import {
    findPeakEftp20Activity,
    findPeakEftp60Activity,
    activityExternalLinks,
} from '../utils/dashboardActivityPeaks';
import { useProfileFtp } from '../context/ProfileFtpContext';
import { describeProfileFtpSourceSubtitle } from '../utils/profileFtp';
import CollapsibleDashboardCard from './dashboard/CollapsibleDashboardCard';

const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('de-DE'); // 1.000 format
};

// ⚡ Bolt Optimization: Use array lookup instead of Date.toLocaleString() in loops
const EN_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const StatCard = ({ title, value, unit, subtitle, icon, trend, colorClass, split, quickLink, sourceMeta }) => {
    const Icon = icon;
    return (
    <div className="bg-cdsurface p-6 rounded-xl border border-cdborder shadow-lg relative overflow-hidden group hover:border-cdborder transition-all">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
            <Icon size={64} />
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg bg-cdborder/50 ${colorClass} text-cdtext`}>
                    <Icon size={18} />
                </div>
                <h3 className="text-cdmuted text-sm font-bold uppercase tracking-wider">{title}</h3>
            </div>

            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-cdtext">{formatNumber(value)}</span>
                {unit && <span className="text-sm font-bold text-cdmuted">{unit}</span>}
            </div>

            {subtitle && (
                <div className="mt-2 flex items-center gap-2 text-xs font-medium">
                    {trend === 'up' && <ArrowUp size={12} className="text-green-400" />}
                    {trend === 'down' && <ArrowDown size={12} className="text-red-400" />}
                    <span className="text-cdmuted">{subtitle}</span>
                </div>
            )}

            {sourceMeta && (
                <p className="mt-2 text-[11px] text-cdtext leading-snug line-clamp-2 border-l-2 border-cdaccent/50 pl-2" title={sourceMeta}>
                    {sourceMeta}
                </p>
            )}

            {quickLink?.onClick && (
                <button
                    type="button"
                    onClick={quickLink.onClick}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cdaccent hover:underline"
                >
                    <ExternalLink size={12} className="shrink-0" />
                    {quickLink.label || 'Open source activity'}
                </button>
            )}

            {/* SPLIT DATA (Indoor / Outdoor) */}
            {split && (
                <div className="mt-4 pt-3 border-t border-cdborder/50 space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-cdmuted">Outdoor</span>
                        <span className="font-mono text-cdtext">{formatNumber(split.outdoor)} {unit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-cdmuted">Indoor</span>
                        <span className="font-mono text-cdtext">{formatNumber(split.indoor)} {unit}</span>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
};

const PeriodStatistics = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Number() converteert ook string-waarden (bijv. uit CSV-import) veilig naar getal.
    // isNaN-check voorkomt dat NaN-waarden de som besmetten.
    const safeNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

    const totalDistance   = Math.round(data.reduce((acc, d) => acc + safeNum(d.distance),    0));
    const totalElevation  = Math.round(data.reduce((acc, d) => acc + safeNum(d.climbing),    0));
    const totalTimeHours  = Math.round(data.reduce((acc, d) => acc + safeNum(d.moving_time), 0) / 3600);
    const totalEnergy     = Math.round(data.reduce((acc, d) => acc + safeNum(d.work),        0));

    // Averages — sla 0-waarden over voor eerlijk gemiddelde
    const ridesWithPower = data.filter(d => safeNum(d.avg_power) > 0);
    const avgPower = ridesWithPower.length > 0
        ? Math.round(ridesWithPower.reduce((acc, d) => acc + safeNum(d.avg_power), 0) / ridesWithPower.length)
        : 0;

    const ridesWithHr = data.filter(d => safeNum(d.avg_hr) > 0);
    const avgHr = ridesWithHr.length > 0
        ? Math.round(ridesWithHr.reduce((acc, d) => acc + safeNum(d.avg_hr), 0) / ridesWithHr.length)
        : 0;

    // Maxima
    // ⚡ Bolt Optimization: Use single-pass reduce instead of Math.max(...array.map())
    // Prevents "RangeError: Maximum call stack size exceeded" on large data arrays and reduces memory allocations
    const maxPower = data.reduce((max, d) => Math.max(max, safeNum(d.max_power)), 0);
    const maxHr    = data.reduce((max, d) => Math.max(max, safeNum(d.max_hr)), 0);

    const maxPowerItem  = data.find(d => safeNum(d.max_power) === maxPower);
    const maxPowerLabel = maxPowerItem ? `(${maxPowerItem.max_power_source || 'Instant'})` : '';

    // Indoor vs Outdoor
    const indoorRides  = data.filter(d => d.type === 'VirtualRide');
    const outdoorRides = data.filter(d => d.type !== 'VirtualRide');

    const indoorDist  = Math.round(indoorRides.reduce((acc, d) => acc + safeNum(d.distance), 0));
    const outdoorDist = totalDistance - indoorDist;

    return (
        <div className={`${chartCardClassLg} mb-6`}>
            <div className="flex items-center gap-2 mb-6 border-b border-cdborder pb-4">
                <Calendar className="text-cdprimary" size={20} />
                <h3 className="text-lg font-bold text-cdtext">Period Statistics</h3>
                <span className="text-xs text-cdmuted ml-auto font-mono">
                    {formatDateDDMMYYYY(data[0].date)} - {formatDateDDMMYYYY(data[data.length - 1].date)}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {/* ... Volume & Intensity Columns ... */}
                {/* COLUMN 1: VOLUME */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-cdmuted mb-2">Volume</h4>
                    <div>
                        <div className="text-2xl font-black text-cdtext">{formatNumber(totalDistance)} <span className="text-xs text-cdmuted font-normal">km</span></div>
                        <div className="text-xs text-cdmuted">Total Distance</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-cdtext">{formatNumber(totalElevation)} <span className="text-xs text-cdmuted font-normal">m</span></div>
                        <div className="text-xs text-cdmuted">Elevation Gain</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-cdtext">{formatNumber(totalTimeHours)} <span className="text-xs text-cdmuted font-normal">hrs</span></div>
                        <div className="text-xs text-cdmuted">Moving Time</div>
                    </div>
                </div>

                {/* COLUMN 2: INTENSITY */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-cdmuted mb-2">Intensity (Avg)</h4>
                    <div>
                        <div className="text-2xl font-black text-green-400">{formatNumber(avgPower)} <span className="text-xs text-cdmuted font-normal">W</span></div>
                        <div className="text-xs text-cdmuted">Avg Power</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-red-400">{avgHr === 0 ? '-' : avgHr} <span className="text-xs text-cdmuted font-normal">bpm</span></div>
                        <div className="text-xs text-cdmuted">Avg Heart Rate</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-cdprimary">{formatNumber(totalEnergy)} <span className="text-xs text-cdmuted font-normal">kJ</span></div>
                        <div className="text-xs text-cdmuted">Total Work</div>
                    </div>
                </div>

                {/* COLUMN 3: MAXIMA */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-cdmuted mb-2">Period Maxima</h4>
                    <div className="bg-cdborder/30 p-3 rounded-lg border border-cdborder">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-xs text-cdmuted">Max Power</span>
                                <span className="text-xs font-bold text-blue-400">{maxPowerLabel.replace(/[()]/g, '')}</span>
                            </div>
                            <span className="text-xl font-bold text-cdtext">{formatNumber(maxPower)} W</span>
                        </div>
                    </div>
                    <div className="bg-cdborder/30 p-3 rounded-lg border border-cdborder">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-cdmuted">Max HR</span>
                            <span className="text-xl font-bold text-cdtext">{maxHr === 0 ? '-' : maxHr} bpm</span>
                        </div>
                    </div>
                </div>

                {/* COLUMN 4: CONTEXT */}
                <div className="space-y-4">
                    <h4 className="text-xs uppercase font-bold text-cdmuted mb-2">Environment</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-cdmuted">Outdoor</span>
                            <span className="font-bold text-cdtext">{formatNumber(outdoorDist)} km <span className="text-cdmuted text-xs">({outdoorRides.length})</span></span>
                        </div>
                        <div className="w-full bg-cdborder h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${(outdoorDist / totalDistance) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-sm mt-3">
                            <span className="text-cdmuted">Indoor (Virtual)</span>
                            <span className="font-bold text-cdtext">{formatNumber(indoorDist)} km <span className="text-cdmuted text-xs">({indoorRides.length})</span></span>
                        </div>
                        <div className="w-full bg-cdborder h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `${(indoorDist / totalDistance) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PerformanceModule = ({
    data,
    manualFtp,
    customTicks,
    onOpenActivityInLog,
    userSettings,
    variant = 'full',
    onGoToPowerTab,
    // Note: Control props (setTimeRange etc) not used here anymore as controls moved to Dashboard
}) => {
    const profileFtp = useProfileFtp();
    const filteredData = data || [];

    // ⚡ Bolt: Memoize chart axis ticks — avoids N× Date allocations on every parent re-render.
    const axisTicks = React.useMemo(
        () => (customTicks ? customTicks.map((t) => new Date(t).getTime()) : undefined),
        [customTicks],
    );

    // ⚡ Bolt: Memoize chart series with dateNum — inline .map() in JSX ran on every render (200+ points).
    // Guard invalid/missing dates so Recharts never receives NaN axis values (production crash hardening).
    const chartSeries = React.useMemo(
        () => filteredData.map((d) => {
            const ts = d?.date ? new Date(d.date).getTime() : Number.NaN;
            return { ...d, dateNum: Number.isFinite(ts) ? ts : null };
        }),
        [filteredData],
    );

    // Check of we jaartallen moeten tonen
    // Criterium: Als de dataset start in een ander jaar dan hij eindigt, OF als de range > 360 dagen is
    const showYearOnAxis = React.useMemo(() => {
        const list = data || [];
        if (list.length < 2) return false;
        const start = new Date(list[0].date);
        const end = new Date(list[list.length - 1].date);

        // Verspringen van jaar? (bv 2024 -> 2025)
        if (start.getFullYear() !== end.getFullYear()) return true;

        // Langer dan een jaar (bv Jan 2025 -> Dec 2025 kan, maar Jan 2025 -> Feb 2026 is true)
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 360;
    }, [data]);

    const theme = getChartTheme();

    // --- 1. Stat Calculation ---
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    const displayFtp = manualFtp || latest?.ftp || 0;

    // Peak eFTP (20m/60m): same rule as enhanceActivity (max derived value; >600 W discarded)
    const peak20Peak = findPeakEftp20Activity(filteredData);
    const peak60Peak = findPeakEftp60Activity(filteredData);
    const displayEftp = peak20Peak.derivedWatts || 0;
    const maxEftp60 = peak60Peak.derivedWatts || 0;

    const hasSeaLevelPower = filteredData.some(d => d.seaLevelPower);

    // Load: Show Average Daily Load for this period
    // If period is 30 days, Sum(Load) / 30 is close to CTL. 
    // But since 'load' in activity is TSS, Avg Load per Ride is distinct from CTL.
    // Let's show "Avg Load / Ride" which definitely changes.
    const avgLoadPerRide = filteredData.length > 0
        ? Math.round(filteredData.reduce((acc, d) => acc + (d.load || 0), 0) / filteredData.length)
        : 0;

    const totalActivities = filteredData.length;
    const showDots = totalActivities < 60;

    // ⚡ Bolt: Single-pass indoor/outdoor split — was two full .filter() passes per render.
    const rideSplit = React.useMemo(() => {
        const indoor = [];
        const outdoor = [];
        for (const d of filteredData) {
            if (d.type === 'VirtualRide') indoor.push(d);
            else outdoor.push(d);
        }
        return { indoor, outdoor };
    }, [filteredData]);

    const { indoor: indoorRides, outdoor: outdoorRides } = rideSplit;

    // 1. Est FTP Split (Max eFTP per environment)
    // ⚡ Bolt Optimization: Use single-pass reduce instead of Math.max(...array.map())
    // Prevents "RangeError: Maximum call stack size exceeded" on large data arrays and reduces memory allocations
    const maxEftpIndoor = indoorRides.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);
    const maxEftpOutdoor = outdoorRides.reduce((max, d) => Math.max(max, d.eFTP || 0), 0);
    const maxEftp60Indoor = indoorRides.reduce((max, d) => Math.max(max, d.eFTP60 || 0), 0);
    const maxEftp60Outdoor = outdoorRides.reduce((max, d) => Math.max(max, d.eFTP60 || 0), 0);

    // 2. Load Split (Avg Load per Ride)
    const avgLoadIndoor = indoorRides.length > 0 ? Math.round(indoorRides.reduce((acc, d) => acc + (d.load || 0), 0) / indoorRides.length) : 0;
    const avgLoadOutdoor = outdoorRides.length > 0 ? Math.round(outdoorRides.reduce((acc, d) => acc + (d.load || 0), 0) / outdoorRides.length) : 0;

    // 3. Total Rides Split
    const countIndoor = indoorRides.length;
    const countOutdoor = outdoorRides.length;

    const peak20Source = peak20Peak;
    const peak60Source = peak60Peak;
    const eftpFromPeak20 = peak20Source.derivedWatts || 0;

    const canOpenActivity = typeof onOpenActivityInLog === 'function';

    const peakSourceMeta = (act) => {
        if (!act?.date) return null;
        const raw = (act.title && String(act.title).trim()) || 'Untitled';
        const short = raw.length > 75 ? `${raw.slice(0, 72)}…` : raw;
        return `${formatDateDDMMYYYY(act.date)} · ${short}`;
    };

    const currentFtpSubtitle = describeProfileFtpSourceSubtitle(userSettings, profileFtp);

    if (variant === 'overview') {
        return (
            <CollapsibleDashboardCard
                title="Performance snapshot"
                icon={Zap}
                description="Current FTP, peak eFTP, and average load for the selected period"
                defaultExpanded
                className="mb-6"
                bodyClassName="!pt-0"
            >
                <div className="flex justify-end mb-3">
                    {typeof onGoToPowerTab === 'function' && (
                        <button
                            type="button"
                            onClick={onGoToPowerTab}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-cdaccent hover:underline cd-focus-ring rounded"
                        >
                            <ExternalLink size={12} className="shrink-0" aria-hidden />
                            Open Power tab
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Current FTP"
                        value={displayFtp}
                        unit="W"
                        subtitle={currentFtpSubtitle}
                        icon={Zap}
                        colorClass="text-blue-500"
                    />
                    <StatCard
                        title="Peak eFTP (20m)"
                        value={displayEftp}
                        unit="W"
                        subtitle="Best 20min × 0.95"
                        sourceMeta={peak20Peak.activity ? peakSourceMeta(peak20Peak.activity) : null}
                        icon={TrendingUp}
                        trend={displayEftp >= displayFtp ? 'up' : 'down'}
                        colorClass="text-green-500"
                        quickLink={
                            peak20Peak.activity && canOpenActivity
                                ? {
                                    label: 'Open source activity',
                                    onClick: () => onOpenActivityInLog(peak20Peak.activity.id, { isolate: true }),
                                }
                                : undefined
                        }
                    />
                    <StatCard
                        title="Avg Load"
                        value={avgLoadPerRide}
                        unit="TSS"
                        subtitle="Per ride (Avg)"
                        icon={Activity}
                        colorClass="text-purple-500"
                        split={{ indoor: avgLoadIndoor, outdoor: avgLoadOutdoor }}
                    />
                </div>
            </CollapsibleDashboardCard>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard
                    title="Current FTP"
                    value={displayFtp}
                    unit="W"
                    subtitle={currentFtpSubtitle}
                    icon={Zap}
                    colorClass="text-blue-500"
                />
                <StatCard
                    title="Peak eFTP (20m)"
                    value={displayEftp}
                    unit="W"
                    subtitle="Best 20min × 0.95"
                    sourceMeta={peak20Peak.activity ? peakSourceMeta(peak20Peak.activity) : null}
                    icon={TrendingUp}
                    trend={displayEftp >= displayFtp ? 'up' : 'down'}
                    colorClass="text-green-500"
                    split={{ indoor: maxEftpIndoor, outdoor: maxEftpOutdoor }}
                    quickLink={
                        peak20Peak.activity && canOpenActivity
                            ? {
                                label: 'Open source activity',
                                onClick: () => onOpenActivityInLog(peak20Peak.activity.id, { isolate: true }),
                            }
                            : undefined
                    }
                />
                <StatCard
                    title="Peak eFTP (60m)"
                    value={maxEftp60 || null}
                    unit="W"
                    subtitle="Best 60-min power"
                    sourceMeta={peak60Peak.activity ? peakSourceMeta(peak60Peak.activity) : null}
                    icon={TrendingUp}
                    colorClass="text-emerald-400"
                    split={maxEftp60Indoor > 0 || maxEftp60Outdoor > 0
                        ? { indoor: maxEftp60Indoor, outdoor: maxEftp60Outdoor }
                        : undefined
                    }
                    quickLink={
                        peak60Peak.activity && canOpenActivity
                            ? {
                                label: 'Open source activity',
                                onClick: () => onOpenActivityInLog(peak60Peak.activity.id, { isolate: true }),
                            }
                            : undefined
                    }
                />
                <StatCard
                    title="Avg Load"
                    value={avgLoadPerRide}
                    unit="TSS"
                    subtitle="Per ride (Avg)"
                    icon={Activity}
                    colorClass="text-purple-500"
                    split={{ indoor: avgLoadIndoor, outdoor: avgLoadOutdoor }}
                />
                <StatCard
                    title="Total Rides"
                    value={totalActivities}
                    unit=""
                    subtitle="In selected period"
                    icon={Calendar}
                    colorClass="text-cdprimary"
                    split={{ indoor: countIndoor, outdoor: countOutdoor }}
                />
            </div>

            {(peak20Source.activity || peak60Source.activity) && (
                <div className="mb-6 p-4 rounded-xl border border-cdborder bg-cdsurface/80 text-sm">
                    <div className="flex items-center gap-2 text-cdtext font-bold mb-2">
                        <ListTree size={16} className="text-cdaccent shrink-0" />
                        Source rides for peak eFTP (this period)
                    </div>
                    <p className="text-xs text-cdmuted mb-3">
                        The stat cards above show the highest <strong className="text-cdtext">eFTP (20m)</strong> and <strong className="text-cdtext">eFTP (60m)</strong> across all rides in your filter. Below: the ride with the best 20-minute and 60-minute power (values over 600&nbsp;W are excluded as implausible).
                    </p>
                    <ul className="space-y-3 text-xs text-cdtext">
                        {peak20Source.activity && (
                            <li className="border-l-2 border-green-500 pl-3">
                                <div className="font-semibold text-cdtext">
                                    eFTP (20m): {peak20Source.best20Raw} W best → {eftpFromPeak20} W (×0.95)
                                </div>
                                <div className="text-cdmuted mt-0.5">
                                    {formatDateDDMMYYYY(peak20Source.activity.date)} — {peak20Source.activity.title || 'Untitled'}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {canOpenActivity && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenActivityInLog(peak20Source.activity.id, { isolate: true })}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder bg-cdborder/30 hover:bg-cdborder text-cdtext font-bold"
                                        >
                                            <ExternalLink size={12} /> Open in Activities
                                        </button>
                                    )}
                                    {activityExternalLinks(peak20Source.activity).map((l) => (
                                        <a
                                            key={l.label}
                                            href={l.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder text-cdaccent hover:underline font-bold"
                                        >
                                            {l.label}
                                        </a>
                                    ))}
                                </div>
                            </li>
                        )}
                        {peak60Source.activity && (
                            <li className="border-l-2 border-emerald-500 pl-3">
                                <div className="font-semibold text-cdtext">
                                    Best 60m power: {peak60Source.best60Raw} W
                                </div>
                                <div className="text-cdmuted mt-0.5">
                                    {formatDateDDMMYYYY(peak60Source.activity.date)} — {peak60Source.activity.title || 'Untitled'}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {canOpenActivity && peak60Source.activity.id !== peak20Source.activity?.id && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenActivityInLog(peak60Source.activity.id, { isolate: true })}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder bg-cdborder/30 hover:bg-cdborder text-cdtext font-bold"
                                        >
                                            <ExternalLink size={12} /> Open in Activities
                                        </button>
                                    )}
                                    {peak60Source.activity.id !== peak20Source.activity?.id &&
                                        activityExternalLinks(peak60Source.activity).map((l) => (
                                            <a
                                                key={l.label}
                                                href={l.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cdborder text-cdaccent hover:underline font-bold"
                                            >
                                                {l.label}
                                            </a>
                                        ))}
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* MOVED: Period Statistics UP */}
            <PeriodStatistics data={filteredData} />

            <div className="grid grid-cols-1 gap-6">
                <div className={chartCardClassLg}>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                        <h3 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            <Activity className="text-blue-400" size={20} />
                            FTP Progression & Load
                        </h3>
                        {/* Controls removed from here */}
                    </div>

                    <div className="min-h-[300px] h-[50vh] max-h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

                                <XAxis
                                    dataKey="dateNum"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    stroke="#64748b"
                                    ticks={axisTicks}
                                    interval={0}
                                    scale="time"
                                    minTickGap={50}
                                    tickFormatter={(timestamp) => {
                                        const d = new Date(timestamp);
                                        if (showYearOnAxis) {
                                            const month = EN_SHORT_MONTHS[d.getMonth()];
                                            const yearShort = d.getFullYear().toString().slice(-2);
                                            return `${d.getDate()} ${month} '${yearShort}`;
                                        }
                                        return `${d.getDate()} ${EN_SHORT_MONTHS[d.getMonth()]}`;
                                    }}
                                />

                                <YAxis yAxisId="left" stroke={theme.axis} tick={{ fill: theme.axis, fontSize: 11 }} domain={['auto', 'auto']} />
                                <YAxis yAxisId="right" orientation="right" stroke={theme.axis} domain={[0, 'auto']} hide />

                                <Tooltip
                                    content={(props) => (
                                        <ChartTooltip
                                            {...props}
                                            labelFormatter={(label) => formatDateDDMMYYYY(label)}
                                        />
                                    )}
                                    cursor={theme.cursor}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="load"
                                    name="Fitness Load"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorLoad)"
                                />

                                <Line
                                    yAxisId="left"
                                    type="stepAfter"
                                    dataKey="ftp"
                                    name="Set FTP"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls
                                />

                                <Line
                                    yAxisId="left"
                                    connectNulls
                                    type="monotone"
                                    dataKey="eFTP"
                                    name="eFTP (Effort)"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={showDots ? { r: 3, fill: '#22c55e' } : false}
                                    activeDot={{ r: 6 }}
                                />

                                {hasSeaLevelPower && (
                                    <Line
                                        yAxisId="left"
                                        connectNulls
                                        type="monotone"
                                        dataKey="seaLevelPower"
                                        name="Sea Level Power"
                                        stroke="#f97316"
                                        strokeWidth={1}
                                        strokeDasharray="5 5"
                                        dot={showDots ? { r: 2, fill: '#f97316' } : false}
                                        activeDot={{ r: 5 }}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PerformanceModule;
