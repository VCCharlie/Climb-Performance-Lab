import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw, Link2, Plus, ChevronDown, ChevronRight, Bike } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { runInBatches } from '../../utils';
import { matchStravaToSite, normalizeStravaActivity, STRAVA_BIKE_TYPES } from '../../utils/stravaMatch';
import { stravaHttpErrorMessage } from '../../utils/stravaHttp';

// Strava logo SVG
const StravaIcon = ({ size = 14 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
);

const ConfidenceBadge = ({ confidence }) => {
    const styles = {
        high: 'bg-green-500/20 text-green-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        low: 'bg-orange-500/20 text-orange-400'
    };
    const labels = { high: 'High', medium: 'Medium', low: 'Low' };
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${styles[confidence]}`}>
            {labels[confidence]}
        </span>
    );
};

const SectionHeader = ({ icon, iconColor, title, count, children }) => {
    const [open, setOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-2 hover:text-cdtext transition-colors">
                {open ? <ChevronDown size={12} className="text-cdmuted" /> : <ChevronRight size={12} className="text-cdmuted" />}
                {React.createElement(icon, { size: 12, className: iconColor })}
                <span className="text-xs uppercase font-bold text-cdmuted">{title}</span>
                <span className="text-xs text-cdmuted ml-auto">{count}</span>
            </button>
            {open && children}
        </div>
    );
};

/**
 * Tab voor het koppelen van Strava-activiteiten aan bestaande site-activiteiten.
 * Stap 1: haal Strava op (gefilterd op fietstypes)
 * Stap 2: fuzzy match op datum + afstand + duur
 * Stap 3: review + bevestig → schrijf strava_id naar Firestore
 */
/** onAfterStravaLink: optional callback after Find/link so the activity list updates without refresh */
const StravaEnrichTab = ({
    activities,
    getStravaToken,
    onImportNew,
    onAfterStravaLink,
    startDate,
    endDate,
    persistedResults,
    onResultsChange,
    enrichmentTarget,
    dateRangeHint = 'Set the date range in the header (dashboard period).',
}) => {
    const [isFetching, setIsFetching] = useState(false);
    const [fetchProgress, setFetchProgress] = useState('');
    const [error, setError] = useState(null);

    // Herstel opgehaalde resultaten na een tab-wissel
    const [results, setResults] = useState(persistedResults ?? null);
    const [selectedMatches, setSelectedMatches] = useState(() => {
        if (!persistedResults?.matched) return new Set();
        return new Set(
            persistedResults.matched
                .filter(m => m.confidence !== 'low')
                .map(m => String(m.strava.id))
        );
    });
    const [selectedNew, setSelectedNew] = useState(new Set());
    const [selectedGearUpdate, setSelectedGearUpdate] = useState(new Set());
    const [isApplying, setIsApplying] = useState(false);
    const [appliedCount, setAppliedCount] = useState(0);

    // ---> NEW: State for single activity linking
    const [manualUrl, setManualUrl] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    const handleDirectLink = useCallback(async (stravaActivity) => {
        if (!enrichmentTarget || !db) return;
        setIsLinking(true);
        setError(null);
        try {
            const token = await getStravaToken();
            // Fetch details for gear and RPE
            const detResp = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivity.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!detResp.ok) throw new Error("Could not load Strava activity details");
            const detailedStrava = await detResp.json();

            // Fetch gear name if not in cache
            const bikesMap = JSON.parse(localStorage.getItem('stravaBikesMap') || '{}');
            if (detailedStrava.gear_id && !bikesMap[detailedStrava.gear_id]) {
                const r = await fetch(`https://www.strava.com/api/v3/gear/${detailedStrava.gear_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (r.ok) {
                    const g = await r.json();
                    bikesMap[detailedStrava.gear_id] = g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Bike';
                    localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap));
                }
            }

            const gearId = detailedStrava.gear_id || null;
            const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;

            const updateData = {
                strava_id: String(detailedStrava.id),
                strava_map: detailedStrava.map?.summary_polyline || null,
                ...(gearId && { gear_id: gearId, gear_name: gearName }),
                ...((!enrichmentTarget.rpe || enrichmentTarget.rpe === 0) && detailedStrava.perceived_exertion && { rpe: detailedStrava.perceived_exertion }),
                ...((!enrichmentTarget.avg_hr || enrichmentTarget.avg_hr === 0) && detailedStrava.average_heartrate && { avg_hr: Math.round(detailedStrava.average_heartrate) }),
                ...((!enrichmentTarget.max_hr || enrichmentTarget.max_hr === 0) && detailedStrava.max_heartrate && { max_hr: Math.round(detailedStrava.max_heartrate) }),
                ...(detailedStrava.name?.trim() && { title: detailedStrava.name.trim() })
            };

            await setDoc(doc(db, 'activities', String(enrichmentTarget.id)), updateData, { merge: true });

            const mergedLocal = { ...enrichmentTarget, ...updateData };
            onAfterStravaLink?.([mergedLocal]);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLinking(false);
        }

    }, [enrichmentTarget, getStravaToken, onAfterStravaLink]);

    const handleManualUrlLink = useCallback(async () => {
        const match = manualUrl.match(/strava\.com\/activities\/(\d+)/);
        if (!match || !match[1]) {
            setError("Invalid Strava URL. Use a link like strava.com/activities/12345…");
            return;
        }
        const stravaId = match[1];
        // Fake a strava activity object to pass to the standard handler
        await handleDirectLink({ id: stravaId });
        setManualUrl('');
    }, [manualUrl, handleDirectLink]);


    const applyResults = useCallback((result) => {
        setResults(result);
        onResultsChange?.(result);
        setSelectedMatches(new Set(
            result.matched
                .filter(m => m.confidence !== 'low')
                .map(m => String(m.strava.id))
        ));
        setSelectedNew(new Set());
    }, [onResultsChange]);

    const fetchAndMatch = useCallback(async () => {
        if (!getStravaToken) return;
        setIsFetching(true);
        setError(null);
        setResults(null);
        onResultsChange?.(null);
        setAppliedCount(0);

        try {
            const token = await getStravaToken();
            const afterTs = Math.floor(new Date(startDate).getTime() / 1000);
            const beforeTs = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

            // Haal alle activiteiten op, gepagineerd (max 200 per pagina)
            let page = 1;
            let allActivities = [];
            while (true) {
                const resp = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!resp.ok) throw new Error(stravaHttpErrorMessage(resp, 'Strava API error'));
                const data = await resp.json();
                if (!Array.isArray(data) || data.length === 0) break;
                allActivities = allActivities.concat(data);
                const bikeSoFar = allActivities.filter((a) => STRAVA_BIKE_TYPES.has(a.sport_type || a.type)).length;
                setFetchProgress(`Strava list page ${page} · ~${bikeSoFar} bike activities so far…`);
                if (data.length < 200) break;
                page++;
            }

            // Alleen fietstypes (Ride, VirtualRide, GravelRide, MountainBikeRide)
            const bikeActivities = allActivities.filter(a =>
                STRAVA_BIKE_TYPES.has(a.sport_type || a.type)
            );

            setFetchProgress(`${bikeActivities.length} bike activities found, matching…`);

            // Haal default/active bikes op via /athlete (geeft alleen default-gear terug, niet alle fietsen)
            const athleteResp = await fetch('https://www.strava.com/api/v3/athlete', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const athleteData = athleteResp.ok ? await athleteResp.json() : {};
            const bikesMap = {};
            (athleteData.bikes || []).forEach(b => {
                bikesMap[b.id] = b.name || 'Bike';
            });

            // Haal gear-naam op voor fietsen die niet via /athlete zijn teruggegeven
            // (Strava geeft via /athlete alleen default-gear; andere fietsen via /gear/{id})
            const unknownGearIds = [...new Set(
                bikeActivities.map(a => a.gear_id).filter(id => id && !bikesMap[id])
            )];
            if (unknownGearIds.length > 0) {
                setFetchProgress(`Loading bike names (${unknownGearIds.length})…`);
                // Batch to prevent hitting browser connection limits or Strava API rate limits
                await runInBatches(unknownGearIds, 5, async gearId => {
                    try {
                        const r = await fetch(`https://www.strava.com/api/v3/gear/${gearId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (r.ok) {
                            const g = await r.json();
                            bikesMap[gearId] = g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Bike';
                        }
                    } catch { /* stille fout — gear_id blijft onbekend */ }
                });
            }

            // Cache bikesMap in localStorage voor gebruik in EditActivityModal
            try { localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap)); } catch { /* quota */ }

            const result = matchStravaToSite(bikeActivities, activities);
            result.bikesMap = bikesMap;

            // CRITIEK: RPE ophalen en gear-check voor al-gekoppelde ritten
            if (result.alreadyLinked.length > 0) {
                setFetchProgress('Checking RPE / gear / HR details…');
                await runInBatches(result.alreadyLinked, 5, async (m) => {
                    try {
                        // Altijd de details ophalen om de meest complete data te hebben
                        const detResp = await fetch(`https://www.strava.com/api/v3/activities/${m.strava.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (detResp.ok) {
                            const detailed = await detResp.json();

                            const siteHasRpe = m.site.rpe && m.site.rpe > 0;
                            const siteHasGear = !!m.site.gear_id;
                            const siteHasHr = m.site.avg_hr && m.site.avg_hr > 0;

                            m.needsRpe = !siteHasRpe && !!detailed.perceived_exertion;
                            m.needsGear = !siteHasGear && !!detailed.gear_id;
                            m.needsHr = !siteHasHr && !!detailed.average_heartrate;

                            if (m.needsRpe) {
                                m.strava.perceived_exertion = detailed.perceived_exertion;
                            }
                            if (m.needsHr) {
                                m.strava.average_heartrate = detailed.average_heartrate;
                                m.strava.max_heartrate = detailed.max_heartrate;
                            }
                        }
                    } catch { console.warn("Detail fetch failed for Strava", m.strava.id); }
                });
            }

            applyResults(result);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsFetching(false);
            setFetchProgress('');
        }
    }, [getStravaToken, startDate, endDate, activities, applyResults, onResultsChange]);

    // Auto-fetch when component loads in single-activity mode
    useEffect(() => {
        if (enrichmentTarget && !results) {
            fetchAndMatch();
        }
    }, [enrichmentTarget, results, fetchAndMatch]);

    const applyEnrichment = async () => {
        if (!results) return;
        setIsApplying(true);

        let count = 0;

        // 1. Schrijf strava_id + gear naar gekoppelde activiteiten in Firestore
        const bikesMap = results.bikesMap || {};
        const toEnrich = results.matched.filter(m => selectedMatches.has(String(m.strava.id)));
        for (const { strava, site } of toEnrich) {
            try {
                if (db) {
                    const gearId = strava.gear_id || null;
                    const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;
                    const stravaTitle = (strava.name || '').trim();
                    await setDoc(
                        doc(db, 'activities', String(site.id)),
                        {
                            strava_id: String(strava.id),
                            strava_map: strava.map?.summary_polyline || null,
                            ...(gearId && { gear_id: gearId, gear_name: gearName }),
                            ...(stravaTitle && { title: stravaTitle }),
                            ...((!site.rpe || site.rpe === 0) && strava.perceived_exertion && { rpe: strava.perceived_exertion }),
                            ...((!site.avg_hr || site.avg_hr === 0) && strava.average_heartrate && { avg_hr: Math.round(strava.average_heartrate) }),
                            ...((!site.max_hr || site.max_hr === 0) && strava.max_heartrate && { max_hr: Math.round(strava.max_heartrate) })
                        },
                        { merge: true }
                    );
                }
                count++;
            } catch (e) {
                console.error('Enrichment fout voor', site.id, e);
            }
        }

        // 2. Importeer nieuwe activiteiten (alleen in Strava, niet op site) — inclusief gear
        if (selectedNew.size > 0) {
            const newActs = results.unmatchedStrava
                .filter(a => selectedNew.has(String(a.id)))
                .map(a => {
                    const norm = normalizeStravaActivity(a);
                    const gearId = a.gear_id || null;
                    const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;
                    return { ...norm, ...(gearId && { gear_id: gearId, gear_name: gearName }) };
                });
            if (onImportNew && newActs.length > 0) onImportNew(newActs);
        }

        // 3. Gear of RPE bijwerken voor al-verbonden activiteiten zonder deze data
        if (selectedGearUpdate.size > 0) {
            const toUpdate = (results.alreadyLinked || []).filter(m =>
                (m.needsGear || m.needsRpe || m.needsHr) && selectedGearUpdate.has(String(m.strava.id))
            );
            for (const { strava, site } of toUpdate) {
                try {
                    if (db) {
                        const gearId = strava.gear_id || null;
                        const gearName = gearId ? (bikesMap[gearId] || 'Strava bike') : null;
                        const stravaTitle = (strava.name || '').trim();
                        const updateData = {
                            ...(gearId && { gear_id: gearId, gear_name: gearName }),
                            ...(stravaTitle && { title: stravaTitle }),
                            ...((!site.rpe || site.rpe === 0) && strava.perceived_exertion && { rpe: strava.perceived_exertion }),
                            ...((!site.avg_hr || site.avg_hr === 0) && strava.average_heartrate && { avg_hr: Math.round(strava.average_heartrate) }),
                            ...((!site.max_hr || site.max_hr === 0) && strava.max_heartrate && { max_hr: Math.round(strava.max_heartrate) })
                        };

                        if (Object.keys(updateData).length > 0) {
                            await setDoc(
                                doc(db, 'activities', String(site.id)),
                                updateData,
                                { merge: true }
                            );
                            count++;
                        }
                    }
                } catch (e) {
                    console.error('Data update fout voor', site.id, e);
                }
            }
            const updatedIds = new Set([...selectedGearUpdate]);
            setResults(prev => ({
                ...prev,
                alreadyLinked: prev.alreadyLinked.map(m =>
                    updatedIds.has(String(m.strava.id)) ? { ...m, needsGear: false, needsRpe: false, needsHr: false } : m
                )
            }));
            setSelectedGearUpdate(new Set());
        }

        setAppliedCount(count);
        setIsApplying(false);

        // Herlaad resultaten om al-gekoppeld status te reflecteren
        if (selectedMatches.size > 0 || selectedNew.size > 0) {
            await fetchAndMatch();
        }
    };

    const toggleMatch = (stravaId) => {
        const id = String(stravaId);
        setSelectedMatches(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };
    const toggleNew = (stravaId) => {
        const id = String(stravaId);
        setSelectedNew(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };
    const toggleGearUpdate = (stravaId) => {
        const id = String(stravaId);
        setSelectedGearUpdate(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    // Vanaf hier: render logic

    // Single-Activity linking view
    if (enrichmentTarget) {
        return (
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="p-3 rounded-lg border-2 border-dashed border-yellow-500/50 bg-yellow-500/5">
                    <h3 className="font-bold text-yellow-400">Link activity</h3>
                    <p className="text-xs text-cdmuted mt-1">
                        Linking <strong className="text-cdtext">{enrichmentTarget.title}</strong> ({enrichmentTarget.date.split('T')[0]}).
                    </p>
                </div>

                {error && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                    </div>
                )}

                {isFetching && (
                    <div className="flex items-center gap-2 text-sm text-cdmuted">
                        <Loader2 size={14} className="animate-spin" /> {fetchProgress || 'Searching Strava…'}
                    </div>
                )}

                {isLinking && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <Loader2 size={14} className="animate-spin" /> Linking…
                    </div>
                )}

                {results && !isFetching && !isLinking && (
                    <div className="space-y-4 animate-in fade-in">
                        <div>
                            <h4 className="text-sm font-bold text-cdtext mb-2">Manual link via URL</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualUrl}
                                    onChange={e => setManualUrl(e.target.value)}
                                    placeholder="Paste Strava activity URL…"
                                    className="w-full bg-cdborder border border-cdborder rounded p-2 text-cdtext focus:border-yellow-400 outline-none text-sm"
                                />
                                <button
                                    onClick={handleManualUrlLink}
                                    disabled={!manualUrl}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded shadow-lg shadow-yellow-500/20 flex items-center gap-2 text-sm disabled:opacity-50"
                                >
                                    Link
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-cdtext mb-2">Strava activities on {startDate}</h4>
                            <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
                                {results.unmatchedStrava.length === 0 && results.matched.length === 0 ? (
                                    <p className="text-xs text-cdmuted text-center py-4">No Strava activities on this day.</p>
                                ) : (
                                    [...results.unmatchedStrava, ...results.matched.map(m => m.strava)].map(strava => (
                                        <div key={strava.id} className="flex items-center gap-2 rounded px-3 py-2 border text-xs bg-cdbg/50 border-cdborder/30">
                                            <span className="w-20 text-cdmuted shrink-0">{strava.start_date_local?.split('T')[0]}</span>
                                            <span className="flex-1 truncate text-cdtext font-medium" title={strava.name}>{strava.name}</span>
                                            <span className="text-cdmuted shrink-0">{Math.round(strava.distance / 100) / 10} km</span>
                                            {strava.average_watts > 0 && <span className="text-yellow-400 font-bold shrink-0">{Math.round(strava.average_watts)}w</span>}
                                            <button
                                                onClick={() => handleDirectLink(strava)}
                                                className="ml-auto px-3 py-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xs transition-colors shrink-0"
                                            >
                                                Link
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default bulk-linking view
    return (
        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">

            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-cdmuted">
                        Range: <span className="text-cdtext font-mono">{startDate}</span> – <span className="text-cdtext font-mono">{endDate}</span>
                        <span className="ml-1 opacity-70">({dateRangeHint})</span>
                    </p>
                    {results && !isFetching && (
                        <p className="text-[10px] text-orange-400 mt-0.5">
                            Results restored from last session — tap &quot;Refresh from Strava&quot; for latest data
                        </p>
                    )}
                </div>
                <button
                    onClick={fetchAndMatch}
                    disabled={isFetching || !getStravaToken}
                    className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded text-sm transition-colors shrink-0"
                >
                    {isFetching ? <Loader2 size={14} className="animate-spin" /> : <StravaIcon size={14} />}
                    {isFetching ? fetchProgress || 'Loading…' : (results ? 'Refresh from Strava' : 'Fetch from Strava')}
                </button>
            </div>

            {!getStravaToken && (
                <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    Connect Strava first under <strong>Settings → Strava connection</strong>.
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {appliedCount > 0 && !isApplying && (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                    <Check size={14} /> <strong>{appliedCount}</strong> activities updated — refresh the page to see bike and map icons in the log.
                </div>
            )}

            {results && (
                <div className="space-y-5">
                    {/* Samenvatting */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-green-400">{results.matched.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Matched</div>
                        </div>
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-orange-400">{results.unmatchedStrava.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Strava only</div>
                        </div>
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-blue-400">{results.alreadyLinked.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Already linked</div>
                        </div>
                    </div>

                    {/* Gekoppelde activiteiten */}
                    {results.matched.length > 0 && (
                        <SectionHeader icon={Link2} iconColor="text-green-400" title="Add Strava ID to existing activities" count={`${selectedMatches.size}/${results.matched.length} selected`}>
                            <div className="flex justify-end mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                    <input type="checkbox" checked={selectedMatches.size === results.matched.length}
                                        onChange={e => setSelectedMatches(e.target.checked ? new Set(results.matched.map(m => String(m.strava.id))) : new Set())}
                                        className="accent-green-500" />
                                    Select all
                                </label>
                            </div>
                            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                {results.matched.map(({ strava, site, confidence, distDiff }) => (
                                    <label key={strava.id} className={`flex items-center gap-2 rounded px-3 py-2 border text-xs cursor-pointer select-none transition-colors ${selectedMatches.has(String(strava.id)) ? 'bg-green-500/5 border-green-500/30' : 'bg-cdbg/50 border-cdborder/30 hover:border-cdborder'}`}>
                                        <input type="checkbox" checked={selectedMatches.has(String(strava.id))} onChange={() => toggleMatch(strava.id)} className="accent-green-500 shrink-0" />
                                        <span className="w-20 text-cdmuted shrink-0">{site.date?.split('T')[0]}</span>
                                        <span className="flex-1 truncate text-cdtext font-medium" title={site.title}>{site.title}</span>
                                        <span className="text-cdmuted shrink-0 w-16 text-right">{site.distance} km</span>
                                        <span className="text-cdmuted shrink-0 text-[10px]">{(distDiff * 100).toFixed(1)}%</span>
                                        <ConfidenceBadge confidence={confidence} />
                                    </label>
                                ))}
                            </div>
                        </SectionHeader>
                    )}

                    {/* Alleen op Strava */}
                    {results.unmatchedStrava.length > 0 && (
                        <SectionHeader icon={Plus} iconColor="text-orange-400" title="Strava only — optional import" count={`${selectedNew.size}/${results.unmatchedStrava.length} selected`}>
                            <div className="flex justify-end mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                    <input type="checkbox" checked={selectedNew.size === results.unmatchedStrava.length}
                                        onChange={e => setSelectedNew(e.target.checked ? new Set(results.unmatchedStrava.map(a => String(a.id))) : new Set())}
                                        className="accent-orange-500" />
                                    Select all
                                </label>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                {results.unmatchedStrava.map(strava => (
                                    <label key={strava.id} className={`flex items-center gap-2 rounded px-3 py-2 border text-xs cursor-pointer select-none transition-colors ${selectedNew.has(String(strava.id)) ? 'bg-orange-500/5 border-orange-500/30' : 'bg-cdbg/50 border-cdborder/30 hover:border-cdborder'}`}>
                                        <input type="checkbox" checked={selectedNew.has(String(strava.id))} onChange={() => toggleNew(strava.id)} className="accent-orange-500 shrink-0" />
                                        <span className="w-20 text-cdmuted shrink-0">{strava.start_date_local?.split('T')[0]}</span>
                                        <span className="flex-1 truncate text-cdtext font-medium" title={strava.name}>{strava.name}</span>
                                        <span className="text-cdmuted shrink-0">{Math.round(strava.distance / 100) / 10} km</span>
                                        {strava.average_watts > 0 && <span className="text-yellow-400 font-bold shrink-0">{Math.round(strava.average_watts)}w</span>}
                                    </label>
                                ))}
                            </div>
                        </SectionHeader>
                    )}

                    {/* Al verbonden – status van Fiets/RPE */}
                    {(results.alreadyLinked || []).length > 0 && (() => {
                        const needsEnrichItems = results.alreadyLinked.filter(m => m.needsGear || m.needsRpe || m.needsHr);
                        return (
                            <SectionHeader icon={RefreshCw} iconColor="text-blue-400" title="Already linked — bike / RPE / HR" count={`${needsEnrichItems.length} can enrich`}>
                                {needsEnrichItems.length > 0 && (
                                    <div className="flex justify-end mb-1.5">
                                        <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                            <input type="checkbox" checked={selectedGearUpdate.size === needsEnrichItems.length}
                                                onChange={e => setSelectedGearUpdate(e.target.checked ? new Set(needsEnrichItems.map(m => String(m.strava.id))) : new Set())}
                                                className="accent-orange-500" />
                                            Select all {needsEnrichItems.length} items that can be enriched
                                        </label>
                                    </div>
                                )}
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {results.alreadyLinked.map(({ strava, site, needsGear, needsRpe, needsHr }) => {
                                        const gearName = results.bikesMap?.[strava.gear_id] || 'Strava bike';
                                        return (
                                            <label key={strava.id} className={`flex items-center gap-2 rounded px-3 py-2 border text-xs cursor-pointer select-none transition-colors ${selectedGearUpdate.has(String(strava.id)) ? 'bg-orange-500/5 border-orange-500/30' : 'bg-cdbg/50 border-cdborder/30 hover:border-cdborder'}`}>
                                                <input type="checkbox" checked={selectedGearUpdate.has(String(strava.id))} onChange={() => toggleGearUpdate(strava.id)} className="accent-orange-500 shrink-0" disabled={!needsGear && !needsRpe && !needsHr} />
                                                <span className="w-20 text-cdmuted shrink-0">{site.date?.split('T')[0]}</span>
                                                <span className="flex-1 truncate text-cdtext font-medium" title={site.title}>{site.title}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {needsGear && <span className="flex items-center gap-1 text-orange-400 text-[10px] whitespace-nowrap" title={`Strava: ${gearName}`}><Bike size={10} /> Bike</span>}
                                                    {needsRpe && <span className="bg-cdaccent/20 text-cdaccent text-[9px] font-bold px-1.5 py-0.5 rounded leading-none" title={`Strava RPE: ${strava.perceived_exertion}`}>MISS RPE</span>}
                                                    {needsHr && <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none" title={`Strava HR: ${strava.average_heartrate}`}>MISS HR</span>}
                                                    {!needsGear && !needsRpe && !needsHr && <span className="flex items-center gap-1 text-green-400/80 text-[10px]"><Check size={12} /> In sync</span>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </SectionHeader>
                        );
                    })()}

                    {results.matched.length === 0 && results.unmatchedStrava.length === 0 && (results.alreadyLinked || []).length === 0 && (
                        <div className="text-sm text-cdmuted text-center py-6">
                            No new or enrichable activities in this range.
                        </div>
                    )}

                    {/* Bevestig-knop */}
                    {(selectedMatches.size > 0 || selectedNew.size > 0 || selectedGearUpdate.size > 0) && (
                        <div className="border-t border-cdborder/50 pt-4 flex items-center justify-between gap-4">
                            <span className="text-xs text-cdmuted flex flex-wrap gap-1">
                                {selectedMatches.size > 0 && <span className="text-green-400 font-bold">{selectedMatches.size} enrich</span>}
                                {selectedMatches.size > 0 && (selectedNew.size > 0 || selectedGearUpdate.size > 0) && <span>·</span>}
                                {selectedNew.size > 0 && <span className="text-orange-400 font-bold">{selectedNew.size} import</span>}
                                {selectedNew.size > 0 && selectedGearUpdate.size > 0 && <span>·</span>}
                                {selectedGearUpdate.size > 0 && <span className="text-orange-400 font-bold">{selectedGearUpdate.size} update bike</span>}
                            </span>
                            <button
                                onClick={applyEnrichment}
                                disabled={isApplying}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded text-sm transition-colors shrink-0"
                            >
                                {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {isApplying ? 'Working…' : 'Apply'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default StravaEnrichTab;
