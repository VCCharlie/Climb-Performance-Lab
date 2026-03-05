import React, { useState, useCallback } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw, Link2, Plus, ChevronDown, ChevronRight, Bike } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { runInBatches } from '../../utils';
import { matchStravaToSite, normalizeStravaActivity, STRAVA_BIKE_TYPES } from '../../utils/stravaMatch';

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
    const labels = { high: 'Hoog', medium: 'Midden', low: 'Laag' };
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${styles[confidence]}`}>
            {labels[confidence]}
        </span>
    );
};

const SectionHeader = ({ icon: IconComponent, iconColor, title, count, children }) => {
    const [open, setOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-2 hover:text-cdtext transition-colors">
                {open ? <ChevronDown size={12} className="text-cdmuted" /> : <ChevronRight size={12} className="text-cdmuted" />}
                <IconComponent size={12} className={iconColor} />
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
const StravaEnrichTab = ({ activities, getStravaToken, onImportNew, startDate, endDate, persistedResults, onResultsChange }) => {
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
                setFetchProgress(`Pagina ${page} ophalen...`);
                const resp = await fetch(
                    `https://www.strava.com/api/v3/athlete/activities?after=${afterTs}&before=${beforeTs}&per_page=200&page=${page}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!resp.ok) throw new Error(`Strava API fout: ${resp.status}`);
                const data = await resp.json();
                if (!Array.isArray(data) || data.length === 0) break;
                allActivities = allActivities.concat(data);
                if (data.length < 200) break;
                page++;
            }

            // Alleen fietstypes (Ride, VirtualRide, GravelRide, MountainBikeRide)
            const bikeActivities = allActivities.filter(a =>
                STRAVA_BIKE_TYPES.has(a.sport_type || a.type)
            );

            setFetchProgress(`${bikeActivities.length} fietsactiviteiten gevonden, matching...`);

            // Haal default/active bikes op via /athlete (geeft alleen default-gear terug, niet alle fietsen)
            const athleteResp = await fetch('https://www.strava.com/api/v3/athlete', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const athleteData = athleteResp.ok ? await athleteResp.json() : {};
            const bikesMap = {};
            (athleteData.bikes || []).forEach(b => {
                bikesMap[b.id] = b.name || 'Fiets';
            });

            // Haal gear-naam op voor fietsen die niet via /athlete zijn teruggegeven
            // (Strava geeft via /athlete alleen default-gear; andere fietsen via /gear/{id})
            const unknownGearIds = [...new Set(
                bikeActivities.map(a => a.gear_id).filter(id => id && !bikesMap[id])
            )];
            if (unknownGearIds.length > 0) {
                setFetchProgress(`Fietsnamen ophalen (${unknownGearIds.length})...`);
                await Promise.all(unknownGearIds.map(async gearId => {
                    try {
                        const r = await fetch(`https://www.strava.com/api/v3/gear/${gearId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (r.ok) {
                            const g = await r.json();
                            bikesMap[gearId] = g.name || [g.brand_name, g.model_name].filter(Boolean).join(' ') || 'Fiets';
                        }
                    } catch { /* stille fout — gear_id blijft onbekend */ }
                }));
            }

            // Cache bikesMap in localStorage voor gebruik in EditActivityModal
            try { localStorage.setItem('stravaBikesMap', JSON.stringify(bikesMap)); } catch { /* quota */ }

            const result = matchStravaToSite(bikeActivities, activities);
            result.bikesMap = bikesMap;

            // CRITIEK: RPE ophalen en gear-check voor al-gekoppelde ritten
            if (result.alreadyLinked.length > 0) {
                setFetchProgress('Checking details for RPE/Gear...');
                await runInBatches(result.alreadyLinked, 5, async (m) => {
                    const siteHasRpe = m.site.rpe && m.site.rpe > 0;

                    // Skip fetch only if RPE is present AND we are sure no gear is needed.
                    // m.needsGear is from the list-view check, which is a good heuristic.
                    if (siteHasRpe && !m.needsGear) {
                        return;
                    }

                    try {
                        const detResp = await fetch(`https://www.strava.com/api/v3/activities/${m.strava.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (detResp.ok) {
                            const detailed = await detResp.json();
                            
                            // Final determination of needsRpe is here, with detailed data.
                            if (!siteHasRpe && detailed.perceived_exertion) {
                                m.strava.perceived_exertion = detailed.perceived_exertion;
                                m.needsRpe = true;
                            }

                            // Final determination of needsGear is also here.
                            if (!m.site.gear_id && detailed.gear_id) {
                                m.needsGear = true;
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
                    const gearName = gearId ? (bikesMap[gearId] || 'Strava fiets') : null;
                    await setDoc(
                        doc(db, 'activities', String(site.id)),
                        {
                            strava_id: String(strava.id),
                            ...(gearId && { gear_id: gearId, gear_name: gearName }),
                            ...((!site.rpe || site.rpe === 0) && strava.perceived_exertion && { rpe: strava.perceived_exertion })
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
                    const gearName = gearId ? (bikesMap[gearId] || 'Strava fiets') : null;
                    return { ...norm, ...(gearId && { gear_id: gearId, gear_name: gearName }) };
                });
            if (onImportNew && newActs.length > 0) onImportNew(newActs);
        }

        // 3. Gear of RPE bijwerken voor al-verbonden activiteiten zonder deze data
        if (selectedGearUpdate.size > 0) {
            const toUpdate = (results.alreadyLinked || []).filter(m =>
                (m.needsGear || m.needsRpe) && selectedGearUpdate.has(String(m.strava.id))
            );
            for (const { strava, site } of toUpdate) {
                try {
                    if (db) {
                        const gearId = strava.gear_id || null;
                        const gearName = gearId ? (bikesMap[gearId] || 'Strava fiets') : null;
                        const updateData = {
                            ...(gearId && { gear_id: gearId, gear_name: gearName }),
                            ...((!site.rpe || site.rpe === 0) && strava.perceived_exertion && { rpe: strava.perceived_exertion })
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
            // Markeer bijgewerkte activiteiten lokaal
            const updatedIds = new Set([...selectedGearUpdate]);
            setResults(prev => ({
                ...prev,
                alreadyLinked: prev.alreadyLinked.map(m =>
                    updatedIds.has(String(m.strava.id)) ? { ...m, needsGear: false, needsRpe: false } : m
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

    return (
        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">

            {/* Ophalen-knop – datumrange via tab-lint boven */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-cdmuted">
                        Periode: <span className="text-cdtext font-mono">{startDate}</span> – <span className="text-cdtext font-mono">{endDate}</span>
                        <span className="ml-1 opacity-70">(aanpasbaar in de tab-balk bovenaan)</span>
                    </p>
                    {results && !isFetching && (
                        <p className="text-[10px] text-orange-400 mt-0.5">
                            ↩ Resultaten hersteld na tab-wissel — klik "Opnieuw ophalen" voor actuele data
                        </p>
                    )}
                </div>
                <button
                    onClick={fetchAndMatch}
                    disabled={isFetching || !getStravaToken}
                    className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded text-sm transition-colors shrink-0"
                >
                    {isFetching ? <Loader2 size={14} className="animate-spin" /> : <StravaIcon size={14} />}
                    {isFetching ? fetchProgress || 'Ophalen...' : (results ? 'Opnieuw ophalen' : 'Ophalen van Strava')}
                </button>
            </div>

            {!getStravaToken && (
                <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    Koppel eerst Strava via <strong>Settings → Strava Koppeling</strong>.
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {appliedCount > 0 && !isApplying && (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                    <Check size={14} /> <strong>{appliedCount}</strong> activiteiten bijgewerkt — herlaad de pagina om fiets &amp; kaartsymbolen te zien in de activiteitenlijst.
                </div>
            )}

            {results && (
                <div className="space-y-5">
                    {/* Samenvatting */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-green-400">{results.matched.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Gekoppeld</div>
                        </div>
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-orange-400">{results.unmatchedStrava.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Alleen Strava</div>
                        </div>
                        <div className="bg-cdbg/50 rounded-lg border border-cdborder/50 p-3 text-center">
                            <div className="text-2xl font-bold text-blue-400">{results.alreadyLinked.length}</div>
                            <div className="text-[10px] text-cdmuted uppercase mt-0.5">Al Verbonden</div>
                        </div>
                    </div>

                    {/* Gekoppelde activiteiten */}
                    {results.matched.length > 0 && (
                        <SectionHeader icon={Link2} iconColor="text-green-400" title="Voeg Strava ID toe aan bestaande activiteiten" count={`${selectedMatches.size}/${results.matched.length} geselecteerd`}>
                            <div className="flex justify-end mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                    <input type="checkbox" checked={selectedMatches.size === results.matched.length}
                                        onChange={e => setSelectedMatches(e.target.checked ? new Set(results.matched.map(m => String(m.strava.id))) : new Set())}
                                        className="accent-green-500" />
                                    Alles selecteren
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
                        <SectionHeader icon={Plus} iconColor="text-orange-400" title="Alleen op Strava — optioneel importeren" count={`${selectedNew.size}/${results.unmatchedStrava.length} geselecteerd`}>
                            <div className="flex justify-end mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                    <input type="checkbox" checked={selectedNew.size === results.unmatchedStrava.length}
                                        onChange={e => setSelectedNew(e.target.checked ? new Set(results.unmatchedStrava.map(a => String(a.id))) : new Set())}
                                        className="accent-orange-500" />
                                    Alles selecteren
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

                    {/* Al verbonden maar data nog niet compleet */}
                    {(results.alreadyLinked || []).some(m => m.needsGear || m.needsRpe) && (() => {
                        const needsEnrichItems = results.alreadyLinked.filter(m => m.needsGear || m.needsRpe);
                        return (
                            <SectionHeader icon={RefreshCw} iconColor="text-orange-400" title="Data nog niet compleet (Fiets/RPE)" count={`${selectedGearUpdate.size}/${needsEnrichItems.length} geselecteerd`}>
                                <div className="flex justify-end mb-1.5">
                                    <label className="flex items-center gap-1.5 text-xs text-cdmuted cursor-pointer select-none">
                                        <input type="checkbox" checked={selectedGearUpdate.size === needsEnrichItems.length}
                                            onChange={e => setSelectedGearUpdate(e.target.checked ? new Set(needsEnrichItems.map(m => String(m.strava.id))) : new Set())}
                                            className="accent-orange-500" />
                                        Alles selecteren
                                    </label>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {needsEnrichItems.map(({ strava, site, needsGear, needsRpe }) => {
                                        const gearName = results.bikesMap?.[strava.gear_id] || 'Strava fiets';
                                        return (
                                            <label key={strava.id} className={`flex items-center gap-2 rounded px-3 py-2 border text-xs cursor-pointer select-none transition-colors ${selectedGearUpdate.has(String(strava.id)) ? 'bg-orange-500/5 border-orange-500/30' : 'bg-cdbg/50 border-cdborder/30 hover:border-cdborder'}`}>
                                                <input type="checkbox" checked={selectedGearUpdate.has(String(strava.id))} onChange={() => toggleGearUpdate(strava.id)} className="accent-orange-500 shrink-0" />
                                                <span className="w-20 text-cdmuted shrink-0">{site.date?.split('T')[0]}</span>
                                                <span className="flex-1 truncate text-cdtext font-medium" title={site.title}>{site.title}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {needsGear && <span className="flex items-center gap-1 text-orange-400 text-[10px] whitespace-nowrap"><Bike size={10} /> {gearName}</span>}
                                                    {needsRpe && <span className="bg-cdaccent/20 text-cdaccent text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">MIST RPE ({strava.perceived_exertion})</span>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </SectionHeader>
                        );
                    })()}

                    {results.matched.length === 0 && results.unmatchedStrava.length === 0 && !(results.alreadyLinked || []).some(m => m.needsGear || m.needsRpe) && (
                        <div className="text-sm text-cdmuted text-center py-6">
                            Geen nieuwe of te verrijken activiteiten gevonden voor deze periode.
                        </div>
                    )}

                    {/* Bevestig-knop */}
                    {(selectedMatches.size > 0 || selectedNew.size > 0 || selectedGearUpdate.size > 0) && (
                        <div className="border-t border-cdborder/50 pt-4 flex items-center justify-between gap-4">
                            <span className="text-xs text-cdmuted flex flex-wrap gap-1">
                                {selectedMatches.size > 0 && <span className="text-green-400 font-bold">{selectedMatches.size} verrijken</span>}
                                {selectedMatches.size > 0 && (selectedNew.size > 0 || selectedGearUpdate.size > 0) && <span>·</span>}
                                {selectedNew.size > 0 && <span className="text-orange-400 font-bold">{selectedNew.size} importeren</span>}
                                {selectedNew.size > 0 && selectedGearUpdate.size > 0 && <span>·</span>}
                                {selectedGearUpdate.size > 0 && <span className="text-orange-400 font-bold">{selectedGearUpdate.size} fiets bijwerken</span>}
                            </span>
                            <button
                                onClick={applyEnrichment}
                                disabled={isApplying}
                                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded text-sm transition-colors shrink-0"
                            >
                                {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {isApplying ? 'Bezig...' : 'Toepassen'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StravaEnrichTab;
