import React, { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { fetchAndEnrichSingleActivityFromUrl } from '../../utils/manualActivityImport';

/**
 * Paste a Strava or Intervals.icu activity URL → fetch → open import preview (same as CSV flow).
 */
const ManualActivityImportBlock = ({
    intervalsConfig,
    stravaGetToken,
    onFetchedActivity,
}) => {
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);

    const handleFetch = async () => {
        setErr(null);
        const trimmed = url.trim();
        if (!trimmed) {
            setErr('Paste an activity URL first.');
            return;
        }
        setBusy(true);
        try {
            let stravaToken = null;
            if (stravaGetToken) {
                try {
                    stravaToken = await stravaGetToken();
                } catch {
                    stravaToken = null;
                }
            }
            const act = await fetchAndEnrichSingleActivityFromUrl(trimmed, {
                intervalsConfig,
                stravaToken,
            });
            onFetchedActivity(act);
            setUrl('');
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
                Paste a single ride link to fetch it and open the import preview (replace a bad merge). Works with{' '}
                <strong className="text-cdtext">Strava</strong> (needs Strava connected) or{' '}
                <strong className="text-cdtext">Intervals.icu</strong> (needs API key in Settings).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.strava.com/activities/… or https://intervals.icu/activities/…"
                    className="flex-1 bg-cdsurface border border-cdborder rounded px-3 py-2 text-xs text-cdtext placeholder:text-cdmuted/70"
                    disabled={busy}
                />
                <button
                    type="button"
                    onClick={handleFetch}
                    disabled={busy}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-cdaccent/20 border border-cdaccent/50 text-cdaccent font-bold text-sm hover:bg-cdaccent/30 disabled:opacity-50"
                >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                    Fetch &amp; preview
                </button>
            </div>
            {err && (
                <p className="text-xs text-red-400 whitespace-pre-wrap">{err}</p>
            )}
        </div>
    );
};

export default ManualActivityImportBlock;
