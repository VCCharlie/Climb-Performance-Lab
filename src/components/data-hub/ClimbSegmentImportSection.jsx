import React, { useCallback, useState } from 'react';
import { Mountain, Upload, Link2, Trash2, ExternalLink, Info } from 'lucide-react';
import { Card, Button, inputBaseClass, cn } from '../ui';
import { useToast } from '../../context/ToastContext';
import ClimbSelector from '../shared/ClimbSelector';
import { useClimbDatabase } from '../../hooks/useClimbDatabase';
import { parseGpxToProfilePoints } from '../../utils/gpxParser.js';
import {
    clearStoredClimbProfile,
    formatClimbProfileSourceLabel,
    getStoredClimbProfile,
    saveStoredClimbProfile,
} from '../../utils/climbProfileStorage.js';
import {
    climbfinderUrlForClimb,
    resolveClimbFromClimbfinderUrl,
} from '../../utils/climbfinderUrl.js';
import { openExternalUrl } from '../../utils/strava.js';

/**
 * Import real elevation profiles (GPX) and link Climbfinder URLs to database climbs.
 */
export default function ClimbSegmentImportSection() {
    const { showToast } = useToast();
    const { climbs, isLoading } = useClimbDatabase();
    const [selectedClimb, setSelectedClimb] = useState(null);
    const [referenceUrl, setReferenceUrl] = useState('');
    const [preview, setPreview] = useState(null);
    const [fileName, setFileName] = useState('');
    const [revision, setRevision] = useState(0);

    // `revision` forces re-read from localStorage after save/clear (no reactive store).
    void revision;
    const stored = selectedClimb?.id ? getStoredClimbProfile(selectedClimb.id) : null;

    const bump = useCallback(() => setRevision((r) => r + 1), []);

    const applyClimbfinderUrl = useCallback(() => {
        const trimmed = referenceUrl.trim();
        if (!trimmed) return;
        const { climb, slug } = resolveClimbFromClimbfinderUrl(trimmed, climbs);
        if (climb) {
            setSelectedClimb(climb);
            showToast(`Matched climb: ${climb.name}`, { variant: 'success' });
            return;
        }
        if (slug) {
            showToast(
                'Climbfinder link recognized, but this climb is not in the local database. Pick a climb manually, then upload GPX.',
                { variant: 'warning', durationMs: 9000 },
            );
        } else {
            showToast('Not a Climbfinder climb URL. Paste https://climbfinder.com/en/climbs/…', { variant: 'warning' });
        }
    }, [referenceUrl, climbs, showToast]);

    const handleGpxFile = useCallback((file) => {
        if (!file) return;
        if (!selectedClimb?.id) {
            showToast('Select a climb first.', { variant: 'warning' });
            return;
        }
        const lower = file.name.toLowerCase();
        if (!lower.endsWith('.gpx') && file.type !== 'application/gpx+xml' && file.type !== 'application/xml') {
            showToast('Choose a .gpx file with track points and elevation.', { variant: 'warning' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseGpxToProfilePoints(String(reader.result || ''));
                setPreview(parsed);
                setFileName(file.name);
                showToast(
                    `GPX parsed: ${parsed.pointCount} points · ${parsed.totalDistanceKm.toFixed(1)} km · +${parsed.elevationGainM} m`,
                    { variant: 'success' },
                );
            } catch (err) {
                setPreview(null);
                setFileName('');
                showToast(err?.message || 'Could not parse GPX.', { variant: 'error', durationMs: 9000 });
            }
        };
        reader.onerror = () => showToast('Could not read file.', { variant: 'error' });
        reader.readAsText(file);
    }, [selectedClimb?.id, showToast]);

    const handleSave = useCallback(() => {
        if (!selectedClimb?.id || !preview?.points?.length) {
            showToast('Parse a GPX file before saving.', { variant: 'warning' });
            return;
        }
        const ref = referenceUrl.trim() || climbfinderUrlForClimb(selectedClimb) || '';
        const { slug } = resolveClimbFromClimbfinderUrl(ref, climbs);
        try {
            saveStoredClimbProfile({
                version: 1,
                climbId: String(selectedClimb.id),
                source: 'gpx',
                importedAt: new Date().toISOString(),
                referenceUrl: ref || undefined,
                climbfinderSlug: slug || undefined,
                fileName: fileName || undefined,
                points: preview.points,
            });
            setPreview(null);
            setFileName('');
            bump();
            showToast(`Profile saved for ${selectedClimb.name}. Open Climb Profiler to view.`, { variant: 'success' });
        } catch (err) {
            showToast(err?.message || 'Save failed.', { variant: 'error' });
        }
    }, [selectedClimb, preview, referenceUrl, climbs, fileName, showToast, bump]);

    const handleClear = useCallback(() => {
        if (!selectedClimb?.id) return;
        if (clearStoredClimbProfile(selectedClimb.id)) {
            bump();
            showToast('Imported profile removed; Profiler uses synthetic data again.', { variant: 'success' });
        }
    }, [selectedClimb, showToast, bump]);

    const cfUrl = selectedClimb ? climbfinderUrlForClimb(selectedClimb) : null;

    return (
        <Card variant="outlined" className="border-cdborder bg-cdsurface/80">
            <div className="flex items-start gap-3 mb-4">
                <Mountain className="text-cdaccent shrink-0 mt-0.5" size={22} aria-hidden />
                <div>
                    <h3 className="text-sm font-bold text-cdtext">Climb profile import (GPX)</h3>
                    <p className="text-xs text-cdmuted mt-1 max-w-2xl leading-relaxed">
                        Real elevation in Climb Profiler comes from a GPX file you upload here — not from a pasted link alone.
                    </p>
                </div>
            </div>

            <div
                role="note"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 mb-4 text-xs text-cdtext space-y-2"
            >
                <p className="font-semibold flex items-center gap-1.5">
                    <Info size={14} className="text-amber-400 shrink-0" aria-hidden />
                    Climbfinder URL vs GPX
                </p>
                <ol className="list-decimal list-inside space-y-1 text-cdmuted leading-relaxed">
                    <li>
                        <span className="text-cdtext">Climbfinder link</span> — matches a climb in this app and opens their page.
                        It does <strong className="text-cdtext font-medium">not</strong> download profile or map data into Climb Lab.
                    </li>
                    <li>
                        On Climbfinder, use <span className="text-cdtext">Export to GPS</span> (GPX), then upload that file below.
                    </li>
                    <li>
                        Click <span className="text-cdtext">Save to Climb Profiler</span> — the chart uses your GPX; the link is stored as reference only.
                    </li>
                </ol>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-xs font-semibold text-cdtext mb-2">Target climb</p>
                    <ClimbSelector
                        selected={selectedClimb}
                        onSelect={(c) => {
                            setSelectedClimb(c);
                            setPreview(null);
                            setFileName('');
                            setReferenceUrl(climbfinderUrlForClimb(c) || '');
                            bump();
                        }}
                    />
                    {isLoading && (
                        <p className="text-[10px] text-cdmuted mt-1">Loading extended climb database…</p>
                    )}
                </div>

                <div>
                    <label className="text-xs font-semibold text-cdtext flex items-center gap-1.5 mb-1.5" htmlFor="cf-ref-url">
                        <Link2 size={14} aria-hidden />
                        Climbfinder or reference URL (optional)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            id="cf-ref-url"
                            type="url"
                            className={cn(inputBaseClass, 'flex-1 text-sm')}
                            placeholder="https://climbfinder.com/en/climbs/alpe-d-huez"
                            value={referenceUrl}
                            onChange={(e) => setReferenceUrl(e.target.value)}
                            onBlur={applyClimbfinderUrl}
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={applyClimbfinderUrl}>
                            Match climb
                        </Button>
                    </div>
                    {cfUrl && (
                        <button
                            type="button"
                            className="text-xs text-cdaccent hover:underline mt-2 inline-flex items-center gap-1"
                            onClick={() => openExternalUrl(cfUrl)}
                        >
                            Open Climbfinder page for selected climb
                            <ExternalLink size={12} aria-hidden />
                        </button>
                    )}
                </div>

                {stored && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-cdtext">
                        Saved profile: {formatClimbProfileSourceLabel(stored)}
                        {' · '}
                        {stored.points.length} points
                        {stored.importedAt ? ` · ${stored.importedAt.split('T')[0]}` : ''}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-cdtext bg-cdbg border border-cdborder rounded-lg px-3 py-2 hover:border-cdaccent/50">
                        <Upload size={16} aria-hidden />
                        Choose GPX
                        <input
                            type="file"
                            accept=".gpx,application/gpx+xml,application/xml"
                            className="sr-only"
                            onChange={(e) => handleGpxFile(e.target.files?.[0])}
                        />
                    </label>
                    {preview && (
                        <span className="text-xs text-cdmuted">
                            Preview: {preview.totalDistanceKm.toFixed(1)} km, +{preview.elevationGainM} m
                        </span>
                    )}
                    <Button type="button" size="sm" onClick={handleSave} disabled={!preview?.points?.length}>
                        Save to Climb Profiler
                    </Button>
                    {stored && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                            <Trash2 size={14} className="mr-1" aria-hidden />
                            Remove import
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
