import React, { useMemo } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button, inputNumberClass, Switch } from '../ui';
import {
    buildHistoricalFtpYearRows,
    DEFAULT_HISTORICAL_FTP_CONFIG,
    HISTORICAL_FTP_SOURCE_20,
    HISTORICAL_FTP_SOURCE_60,
    normalizeHistoricalFtpConfig,
} from '../../utils/historicalFtp';

function configButtonClass(active) {
    return `px-3 py-1.5 rounded text-xs font-bold border cd-transition ${
        active
            ? 'bg-cdaccent/15 border-cdaccent/50 text-cdaccent'
            : 'border-cdborder text-cdmuted hover:text-cdtext'
    }`;
}

function YearRowCard({ row, onOverrideChange }) {
    return (
        <article className="rounded-lg border border-cdborder/60 bg-cdsurfacelow/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-cdtext tabular-nums">{row.year}</h4>
                <span className="text-sm font-semibold text-cdaccent tabular-nums">
                    {row.effectiveFtp ?? '—'} W
                </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div>
                    <dt className="text-cdmuted uppercase tracking-wide text-[9px] font-bold">Auto FTP</dt>
                    <dd className="text-cdtext tabular-nums">
                        {row.autoFtp ?? '—'}
                        {row.trimmedCount > 0 && row.autoFtp != null && (
                            <span className="block text-[9px] text-cdmuted">trimmed {row.trimmedCount}</span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-cdmuted uppercase tracking-wide text-[9px] font-bold">Rides</dt>
                    <dd className="text-cdtext tabular-nums">{row.effortCount}</dd>
                </div>
                <div>
                    <dt className="text-cdmuted uppercase tracking-wide text-[9px] font-bold">Used in avg</dt>
                    <dd className="text-cdtext tabular-nums">{row.effortsUsed > 0 ? row.effortsUsed : '—'}</dd>
                </div>
                <div>
                    <dt className="text-cdmuted uppercase tracking-wide text-[9px] font-bold">Override</dt>
                    <dd>
                        <input
                            type="number"
                            min={0}
                            max={600}
                            placeholder="—"
                            value={row.overrideFtp ?? ''}
                            onChange={(e) => onOverrideChange(row.year, e.target.value)}
                            className={`${inputNumberClass} w-full max-w-[7rem] py-1 text-xs`}
                            aria-label={`FTP override for ${row.year}`}
                        />
                    </dd>
                </div>
            </dl>
        </article>
    );
}

/**
 * Settings panel: per-year historical FTP (auto from peaks + manual overrides).
 */
export default function HistoricalFtpSettings({ activities, userSettings, updateUserSettings }) {
    const historicalFtp = userSettings.historicalFtp || {};
    const config = normalizeHistoricalFtpConfig(historicalFtp.config);

    const yearRows = useMemo(
        () => buildHistoricalFtpYearRows(activities, userSettings),
        [activities, userSettings],
    );

    const patchHistoricalFtp = (patch) => {
        updateUserSettings('historicalFtp', {
            config: { ...DEFAULT_HISTORICAL_FTP_CONFIG, ...historicalFtp.config },
            overrides: { ...(historicalFtp.overrides || {}) },
            ...historicalFtp,
            ...patch,
        });
    };

    const patchConfig = (key, value) => {
        patchHistoricalFtp({
            config: { ...config, [key]: value },
        });
    };

    const setOverride = (year, value) => {
        const overrides = { ...(historicalFtp.overrides || {}) };
        const key = String(year);
        if (value === '' || value == null || Number(value) <= 0) {
            delete overrides[key];
            delete overrides[year];
        } else {
            overrides[key] = Math.round(Number(value));
        }
        patchHistoricalFtp({ overrides });
    };

    const clearAllOverrides = () => {
        patchHistoricalFtp({ overrides: {} });
    };

    const sourceLabel = config.source === HISTORICAL_FTP_SOURCE_60
        ? '60 min peaks (average)'
        : '20 min peaks × 0.95';

    return (
        <div className="space-y-6">
            <div className="rounded-cdlg border border-cdborder bg-cdsurface p-4 sm:p-6">
                <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                    <History className="text-cdaccent" size={18} />
                    <h3 className="font-bold text-cdtext">Historical FTP by year</h3>
                </div>

                <p className="text-xs text-cdmuted mb-4 leading-relaxed">
                    Long-term power trends use an FTP sanity cap per calendar year (peak power may not exceed
                    FTP × 1.1 for 60 min). When enabled, each year uses its own estimated FTP instead of your
                    current profile FTP — so older peaks are not unfairly clipped.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cdborder/30 pb-4 mb-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-cdtext">Use historical FTP in charts</p>
                        <p className="text-xs text-cdmuted">Applies to Long-term power trends on Dashboard → Power.</p>
                    </div>
                    <Switch
                        checked={config.enabled}
                        onChange={(next) => patchConfig('enabled', next)}
                        ariaLabel="Toggle historical FTP in charts"
                    />
                </div>

                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-semibold text-cdmuted mb-2 uppercase tracking-wide">Estimate from</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => patchConfig('source', HISTORICAL_FTP_SOURCE_20)}
                                className={configButtonClass(config.source === HISTORICAL_FTP_SOURCE_20)}
                            >
                                20 min peaks × 0.95
                            </button>
                            <button
                                type="button"
                                onClick={() => patchConfig('source', HISTORICAL_FTP_SOURCE_60)}
                                className={configButtonClass(config.source === HISTORICAL_FTP_SOURCE_60)}
                            >
                                60 min peaks (average)
                            </button>
                        </div>
                        <p className="text-[10px] text-cdmuted mt-2">
                            Per year: take the highest efforts, optionally drop the top outlier(s), average the rest,
                            then convert to FTP ({sourceLabel}).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-semibold text-cdmuted mb-1 uppercase">Top efforts (N)</label>
                            <input
                                type="number"
                                min={3}
                                max={20}
                                value={config.topN}
                                onChange={(e) => patchConfig('topN', Number(e.target.value))}
                                className={inputNumberClass}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-cdmuted mb-1 uppercase">Trim highest</label>
                            <input
                                type="number"
                                min={0}
                                max={3}
                                value={config.trimHigh}
                                onChange={(e) => patchConfig('trimHigh', Number(e.target.value))}
                                className={inputNumberClass}
                            />
                            <p className="text-[10px] text-cdmuted mt-1">Drop 0–3 outliers before averaging.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-cdmuted mb-1 uppercase">Min efforts</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={config.minEfforts}
                                onChange={(e) => patchConfig('minEfforts', Number(e.target.value))}
                                className={inputNumberClass}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-cdlg border border-cdborder bg-cdsurface p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h3 className="font-bold text-cdtext text-sm">Yearly values</h3>
                        <p className="text-[10px] text-cdmuted">
                            Auto values refresh from your activity log. Override any year manually — overrides sync to the cloud.
                        </p>
                    </div>
                    {Object.keys(historicalFtp.overrides || {}).length > 0 && (
                        <Button type="button" variant="tonal" size="sm" onClick={clearAllOverrides}>
                            <RotateCcw size={14} aria-hidden />
                            Clear all overrides
                        </Button>
                    )}
                </div>

                {yearRows.length === 0 ? (
                    <p className="text-xs text-cdmuted">
                        No yearly FTP estimates yet — import rides with best 20 min / 60 min power fields.
                    </p>
                ) : (
                    <>
                        <div className="md:hidden space-y-2">
                            {yearRows.map((row) => (
                                <YearRowCard
                                    key={row.year}
                                    row={row}
                                    onOverrideChange={setOverride}
                                />
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto rounded-lg border border-cdborder/60">
                            <table className="w-full min-w-[520px] text-xs text-left">
                                <thead className="bg-cdbg/50 text-cdmuted uppercase tracking-wide text-[10px]">
                                    <tr>
                                        <th className="px-3 py-2 font-bold">Year</th>
                                        <th className="px-3 py-2 font-bold">Auto FTP</th>
                                        <th className="px-3 py-2 font-bold">Override</th>
                                        <th className="px-3 py-2 font-bold">Effective</th>
                                        <th className="px-3 py-2 font-bold">Rides</th>
                                        <th className="px-3 py-2 font-bold">Used in avg</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cdborder/40">
                                    {yearRows.map((row) => (
                                        <tr key={row.year} className="text-cdtext">
                                            <td className="px-3 py-2 tabular-nums">{row.year}</td>
                                            <td className="px-3 py-2 tabular-nums text-cdmuted">
                                                {row.autoFtp ?? '—'}
                                                {row.trimmedCount > 0 && row.autoFtp != null && (
                                                    <span className="block text-[9px] text-cdmuted">
                                                        trimmed {row.trimmedCount}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={600}
                                                    placeholder="—"
                                                    value={row.overrideFtp ?? ''}
                                                    onChange={(e) => setOverride(row.year, e.target.value)}
                                                    className={`${inputNumberClass} w-20 py-1 text-xs`}
                                                    aria-label={`FTP override for ${row.year}`}
                                                />
                                            </td>
                                            <td className="px-3 py-2 tabular-nums font-semibold text-cdaccent whitespace-nowrap">
                                                {row.effectiveFtp ?? '—'}
                                            </td>
                                            <td className="px-3 py-2 tabular-nums text-cdmuted">{row.effortCount}</td>
                                            <td className="px-3 py-2 tabular-nums text-cdmuted">
                                                {row.effortsUsed > 0 ? row.effortsUsed : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
