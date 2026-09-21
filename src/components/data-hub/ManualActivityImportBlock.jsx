import React, { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { fetchMergedActivityFromPrimaryAndOptionalUrl } from '../../utils/manualActivityImport';

/**
 * Paste Strava and/or Intervals.icu activity URLs → fetch → open import preview.
 * Optional second URL: must be the other service; result uses Intervals id + merged Strava fields.
 */
const ManualActivityImportBlock = ({
    intervalsConfig,
    stravaGetToken,
    onFetchedActivity,
}) => {
    const [primaryUrl, setPrimaryUrl] = useState('');
    const [secondUrl, setSecondUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    const handleFetch = async () => {
        setErr(null);
        const p = primaryUrl.trim();
        if (!p) {
            setErr('Paste a primary activity URL first.');
            return;
        }
        setBusy(true);
        try {
            const act = await fetchMergedActivityFromPrimaryAndOptionalUrl(p, secondUrl, {
                intervalsConfig,
                stravaGetToken,
            });
            onFetchedActivity(act);
            setPrimaryUrl('');
            setSecondUrl('');
        } catch (e) {
            setErr(e.message || String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-xl border border-cdborder bg-cdbg/30 p-4 space-y-3">
            <h4 className="text-cdtext font-bold text-sm flex items-center gap-2">
                <Link2 size={16} className="text-cdaccent" />
                Add activity by URL
            </h4>
            <p className="text-xs text-cdmuted leading-relaxed">
                <strong className="text-cdtext">Primary URL:</strong> Strava or Intervals.icu activity link.
                <strong className="text-cdtext"> Optional second URL:</strong> the <strong className="text-cdtext">other</strong> service.
                The merged row keeps your <strong className="text-cdtext">Intervals activity id</strong> and adds Strava route/gear and fills gaps (same rules as merge pair).
                Strava connection + Intervals API key in Settings when both sides are used.
            </p>
            <p className="text-xs text-cdmuted leading-relaxed border border-cdborder/60 rounded-lg px-3 py-2 bg-cdsurface/40">
                <strong className="text-cdtext">Strava-sourced rides on Intervals.icu:</strong> Intervals cannot share Strava metrics through their activity API.
                An Intervals-only URL often previews empty — connect Strava in Settings (we auto-fill from Strava), or paste the Strava URL as primary or in the optional second field.
                Best 1–60 min peaks come from the Intervals power curve when a FIT file exists there; otherwise we compute them from Strava watt streams (requires power data on Strava).
            </p>
            <div className="space-y-2">
                <label className="block text-[10px] font-bold text-cdmuted uppercase">Primary URL</label>
                <input
                    type="url"
                    value={primaryUrl}
                    onChange={(e) => setPrimaryUrl(e.target.value)}
                    placeholder="Strava or Intervals activity URL…"
                    className="w-full bg-cdsurface border border-cdborder rounded px-3 py-2 text-xs text-cdtext placeholder:text-cdmuted/70"
                    disabled={busy}
                />
            </div>
            <div className="space-y-2">
                <label className="block text-[10px] font-bold text-cdmuted uppercase">Optional — other service URL</label>
                <input
                    type="url"
                    value={secondUrl}
                    onChange={(e) => setSecondUrl(e.target.value)}
                    placeholder="If primary is Strava, paste Intervals URL here (or the reverse)"
                    className="w-full bg-cdsurface border border-cdborder rounded px-3 py-2 text-xs text-cdtext placeholder:text-cdmuted/70"
                    disabled={busy}
                />
            </div>
            <button
                type="button"
                onClick={handleFetch}
                disabled={busy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-cdaccent/20 border border-cdaccent/50 text-cdaccent font-bold text-sm hover:bg-cdaccent/30 disabled:opacity-50"
            >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Fetch &amp; preview
            </button>
            {err && (
                <p className="text-xs text-red-400 whitespace-pre-wrap">{err}</p>
            )}
        </div>
    );
};

export default ManualActivityImportBlock;
