import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MapPin, Upload } from 'lucide-react';
import { Button } from '../ui';
import {
    formatRouteMapCoverageSummary,
    summarizeActivityRouteMapCoverage,
} from '../../utils/activityRouteMapCoverage.js';
import { validateBackupPayload, BACKUP_MAX_BYTES } from '../../utils/backupSchema.js';
import { useToast } from '../../context/ToastContext';

const MISSING_LIST_CAP = 40;

/**
 * Backup tab helper: route polyline coverage (strava_map or intervals_map).
 */
export default function RouteMapCoverageSettings({ activities }) {
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [report, setReport] = useState(null);
    const [showMissing, setShowMissing] = useState(false);
    const [reportSource, setReportSource] = useState('loaded');

    const runReport = useCallback((list, sourceLabel) => {
        const summary = summarizeActivityRouteMapCoverage(list);
        setReport(summary);
        setReportSource(sourceLabel);
        setShowMissing(false);
    }, []);

    const handleCheckLoaded = useCallback(() => {
        const list = activities || [];
        if (!list.length) {
            showToast('No activities loaded yet. Open Activities or sign in to sync first.', { variant: 'warning' });
            return;
        }
        runReport(list, 'loaded');
    }, [activities, runReport, showToast]);

    const handleBackupFile = useCallback((e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > BACKUP_MAX_BYTES) {
            showToast(`Backup file is too large (max ${Math.round(BACKUP_MAX_BYTES / (1024 * 1024))} MB).`, {
                variant: 'error',
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result || ''));
                const validation = validateBackupPayload(data);
                if (!validation.ok) {
                    showToast(`Invalid backup file: ${validation.error}`, { variant: 'error' });
                    return;
                }
                const list = Array.isArray(data.activities) ? data.activities : [];
                if (!list.length) {
                    showToast('Backup has no activities array (or it is empty).', { variant: 'warning' });
                    return;
                }
                runReport(list, 'backup');
            } catch {
                showToast('Could not parse JSON backup file.', { variant: 'error' });
            }
        };
        reader.onerror = () => {
            showToast('Could not read backup file.', { variant: 'error' });
        };
        reader.readAsText(file);
    }, [runReport, showToast]);

    const summaryLines = useMemo(() => {
        if (!report) return null;
        return formatRouteMapCoverageSummary(report).split('\n');
    }, [report]);

    const missingPreview = useMemo(() => {
        if (!report?.missingActivities?.length) return [];
        return report.missingActivities.slice(0, MISSING_LIST_CAP);
    }, [report]);

    const missingOverflow = report && report.missingActivities.length > MISSING_LIST_CAP
        ? report.missingActivities.length - MISSING_LIST_CAP
        : 0;

    const pct = report && report.total > 0
        ? Math.round((report.withRouteMap / report.total) * 100)
        : 0;

    return (
        <div className="rounded-cdlg border border-cdborder bg-cdsurface p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                <MapPin className="text-cdaccent shrink-0" size={18} aria-hidden />
                <h3 className="font-bold text-cdtext">Route map coverage</h3>
            </div>
            <p className="text-xs text-cdmuted mb-3 leading-relaxed">
                Counts activities with a stored route polyline from Strava (<code className="text-cdtext">strava_map</code>)
                or Intervals (<code className="text-cdtext">intervals_map</code>). Runs in the browser — nothing is uploaded.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="tonal" className="flex-1" onClick={handleCheckLoaded}>
                    Check loaded activities
                </Button>
                <Button
                    type="button"
                    variant="outlined"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={14} aria-hidden /> Check backup file
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={handleBackupFile}
                />
            </div>

            {report && summaryLines && (
                <div
                    className="mt-4 rounded-cdmd border border-cdborder bg-cdsurface/80 p-3 text-sm text-cdtext"
                    role="status"
                    aria-live="polite"
                >
                    <p className="font-semibold mb-1">
                        {reportSource === 'backup' ? 'Backup file' : 'Loaded activities'}:
                        {' '}
                        {report.withRouteMap}/{report.total} with route ({pct}%)
                    </p>
                    <ul className="text-xs text-cdmuted space-y-0.5 list-disc list-inside">
                        {summaryLines.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                    {report.missingRouteMap > 0 && (
                        <div className="mt-3">
                            <Button
                                type="button"
                                variant="text"
                                className="text-xs h-8 px-2"
                                onClick={() => setShowMissing((v) => !v)}
                            >
                                {showMissing ? 'Hide' : 'Show'} rides without route ({report.missingRouteMap})
                            </Button>
                            {showMissing && (
                                <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-cdmuted space-y-1 border-t border-cdborder/50 pt-2">
                                    {missingPreview.map((row) => {
                                        const date = row.date ? String(row.date).split('T')[0] : '?';
                                        const title = row.title || '(no title)';
                                        const type = row.type ? ` · ${row.type}` : '';
                                        return (
                                            <li key={`${row.id}-${date}`} className="font-mono">
                                                {date} · {row.id} · {title}{type}
                                            </li>
                                        );
                                    })}
                                    {missingOverflow > 0 && (
                                        <li className="text-cdmuted italic">…and {missingOverflow} more</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
