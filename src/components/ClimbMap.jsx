/**
 * src/components/ClimbMap.jsx
 * Interactieve kaart van alle echte klimmen (Leaflet + OpenStreetMap)
 * Zwift-klimmen worden niet getoond (geen GPS-coördinaten)
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { MapPin, LocateFixed, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { CLIMB_DATABASE } from '../climbs';
import { haversineDistance, calculateClimbCategory } from '../utils/calculations';
import FlagIcon from './FlagIcon';

// Klimmen met GPS (echte klimmen, geen Zwift)
const REAL_CLIMBS = CLIMB_DATABASE.filter(c => c.lat != null && c.lon != null);

const CAT_COLORS = {
    HC: '#ffffff',
    '1': '#dc2626',
    '2': '#f97316',
    '3': '#eab308',
    '4': '#22c55e',
};

const createClimbIcon = (cat) => {
    const color = CAT_COLORS[cat] || '#94a3b8';
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 10px; height: 10px;
            background: ${color};
            border: 2px solid rgba(0,0,0,0.5);
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.6);
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
    });
};

const createUserIcon = () => L.divIcon({
    className: '',
    html: `<div style="
        width: 14px; height: 14px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Haal de dichtstbijzijnde weg(en) op via Overpass API en geef GeoJSON LineString terug.
 * We halen alle wegen op in een radius van ~300m rondom het startpunt.
 */
const fetchClimbTrack = async (lat, lon, lengthKm) => {
    // radius in meters: begrensd op 500m zodat we de juiste weg pakken
    const radius = 300;
    const query = `[out:json][timeout:15];
(
  way(around:${radius},${lat},${lon})[highway~"^(primary|secondary|tertiary|unclassified|residential|track|service)$"];
)->.roads;
.roads out geom;`;

    try {
        const res = await fetch(OVERPASS_API, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) return null;
        const data = await res.json();

        if (!data.elements?.length) return null;

        // Pak alle wegen als polylines; kies de langste die door/dichtbij startpunt gaat
        const ways = data.elements
            .filter(e => e.type === 'way' && e.geometry?.length > 1)
            .map(e => ({
                id: e.id,
                coords: e.geometry.map(n => [n.lat, n.lon]),
            }));

        if (!ways.length) return null;

        // Vind de weg waarvan een node het dichtst bij ons startpunt ligt
        let bestWay = null;
        let bestDist = Infinity;
        ways.forEach(way => {
            way.coords.forEach(([wlat, wlon]) => {
                const d = Math.hypot(wlat - lat, wlon - lon);
                if (d < bestDist) { bestDist = d; bestWay = way; }
            });
        });

        return bestWay ? bestWay.coords : null;
    } catch {
        return null;
    }
};

const RADIUS_OPTIONS = [50, 100, 200, 500];

const ClimbMap = ({ bucketListState, onUpdateBucketList }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersLayerRef = useRef(null);
    const userMarkerRef = useRef(null);
    const trackLayerRef = useRef(null);
    const containerRef = useRef(null);

    const [userPos, setUserPos] = useState(null);
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState('');
    const [nearbyRadius, setNearbyRadius] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [countryFilter, setCountryFilter] = useState('All');
    const [catFilter, setCatFilter] = useState('All');
    const [minGrade, setMinGrade] = useState(0);
    const [maxGrade, setMaxGrade] = useState(25);
    const [selectedClimb, setSelectedClimb] = useState(null);
    const [trackLoading, setTrackLoading] = useState(false);
    const [totalShown, setTotalShown] = useState(0);

    const bucketDone = useMemo(() => new Set(bucketListState?.done || []), [bucketListState]);
    const bucketPlanned = useMemo(() => new Set(bucketListState?.planned || []), [bucketListState]);
    const bucketWant = useMemo(() => new Set(bucketListState?.want || []), [bucketListState]);

    const uniqueCountries = useMemo(() => {
        const countries = [...new Set(REAL_CLIMBS.map(c => c.country))].sort();
        return ['All', ...countries];
    }, []);

    // Filter de klimmen op basis van actieve filters
    const filteredClimbs = useMemo(() => {
        let climbs = REAL_CLIMBS;
        if (countryFilter !== 'All') climbs = climbs.filter(c => c.country === countryFilter);
        climbs = climbs.filter(c => c.avgGrade >= minGrade && c.avgGrade <= maxGrade);
        if (nearbyRadius && userPos) {
            climbs = climbs.filter(c =>
                haversineDistance(userPos.lat, userPos.lng, c.lat, c.lon) <= nearbyRadius
            );
        }
        return climbs;
    }, [countryFilter, catFilter, minGrade, maxGrade, nearbyRadius, userPos]);

    // Init Leaflet kaart
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [46.5, 8.5],
            zoom: 6,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Herplaats markers bij filterwijziging
    useEffect(() => {
        if (!markersLayerRef.current) return;
        markersLayerRef.current.clearLayers();
        // Verwijder track van vorige selectie
        if (trackLayerRef.current) {
            trackLayerRef.current.remove();
            trackLayerRef.current = null;
        }
        setSelectedClimb(null);

        filteredClimbs.forEach(climb => {
            const cat = calculateClimbCategory(climb.lengthKm, climb.avgGrade);
            const marker = L.marker([climb.lat, climb.lon], {
                icon: createClimbIcon(cat.label),
                title: climb.name,
            });

            const inBucket = bucketDone.has(climb.id)
                ? '✅ Done'
                : bucketPlanned.has(climb.id)
                ? '📅 Planned'
                : bucketWant.has(climb.id)
                ? '⭐ Want'
                : null;

            marker.bindPopup(
                `<div style="min-width:180px; font-family: system-ui, sans-serif;">
                    <strong style="font-size:13px;">${climb.name}</strong>
                    <div style="color:#666; font-size:11px; margin-top:2px;">${climb.region || ''} · ${climb.country}</div>
                    <div style="margin-top:6px; font-size:12px; display:flex; gap:8px; flex-wrap:wrap;">
                        <span>📏 ${climb.lengthKm} km</span>
                        <span>📐 ${climb.avgGrade}%</span>
                        <span>⛰️ ${climb.elevation}m</span>
                    </div>
                    ${inBucket ? `<div style="margin-top:6px; font-size:11px; font-weight:bold;">${inBucket}</div>` : ''}
                    <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                        ${!bucketDone.has(climb.id) ? `<button onclick="window.__climbMapAction('done','${climb.id}')" style="font-size:10px; padding:3px 7px; border-radius:4px; background:#22c55e; color:white; border:none; cursor:pointer;">✅ Done</button>` : ''}
                        ${!bucketPlanned.has(climb.id) ? `<button onclick="window.__climbMapAction('planned','${climb.id}')" style="font-size:10px; padding:3px 7px; border-radius:4px; background:#3b82f6; color:white; border:none; cursor:pointer;">📅 Plan</button>` : ''}
                        ${!bucketWant.has(climb.id) ? `<button onclick="window.__climbMapAction('want','${climb.id}')" style="font-size:10px; padding:3px 7px; border-radius:4px; background:#a855f7; color:white; border:none; cursor:pointer;">⭐ Want</button>` : ''}
                    </div>
                </div>`,
                { maxWidth: 260 }
            );

            marker.on('click', () => {
                setSelectedClimb(climb);
                // Verwijder vorige track
                if (trackLayerRef.current) {
                    trackLayerRef.current.remove();
                    trackLayerRef.current = null;
                }
                // Haal Overpass track op als de klim echte GPS heeft
                if (climb.lat != null && climb.lon != null) {
                    setTrackLoading(true);
                    fetchClimbTrack(climb.lat, climb.lon, climb.lengthKm).then(coords => {
                        setTrackLoading(false);
                        if (!coords || !mapInstanceRef.current) return;
                        trackLayerRef.current = L.polyline(coords, {
                            color: '#f59e0b',
                            weight: 4,
                            opacity: 0.85,
                        }).addTo(mapInstanceRef.current);
                    });
                }
            });
            markersLayerRef.current.addLayer(marker);
        });

        setTotalShown(filteredClimbs.length);
    }, [filteredClimbs, bucketDone, bucketPlanned, bucketWant]);

    // Globale bucket list actie handler (vanuit Leaflet popup)
    useEffect(() => {
        window.__climbMapAction = (action, climbId) => {
            if (!onUpdateBucketList) return;
            onUpdateBucketList(action, climbId);
        };
        return () => { delete window.__climbMapAction; };
    }, [onUpdateBucketList]);

    // Toon gebruikerslocatie op kaart
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }
        if (userPos) {
            userMarkerRef.current = L.marker([userPos.lat, userPos.lng], {
                icon: createUserIcon(),
                zIndexOffset: 1000,
                title: 'Your location',
            })
                .addTo(mapInstanceRef.current)
                .bindPopup('<strong>📍 Your location</strong>');
        }
    }, [userPos]);

    const locateMe = useCallback(() => {
        if (!navigator.geolocation) {
            setLocError('Geolocation is not available in this browser.');
            return;
        }
        setLocating(true);
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserPos({ lat: latitude, lng: longitude });
                setNearbyRadius(r => r || 100);
                mapInstanceRef.current?.flyTo([latitude, longitude], 9, { duration: 1.2 });
                setLocating(false);
            },
            (err) => {
                setLocError('Could not determine location: ' + err.message);
                setLocating(false);
            },
            { timeout: 8000 }
        );
    }, []);

    const clearNearby = useCallback(() => {
        setNearbyRadius(null);
        setUserPos(null);
        mapInstanceRef.current?.flyTo([46.5, 8.5], 6, { duration: 1 });
    }, []);

    return (
        <div className="space-y-3">
            {/* Header + controls */}
            <div className="bg-cdsurface border border-cdborder rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-cdtext flex items-center gap-2">
                            <MapPin size={18} className="text-cdaccent" />
                            Climbs Map
                        </h2>
                        <p className="text-xs text-cdmuted mt-0.5">
                            {totalShown.toLocaleString('nl-NL')} of {REAL_CLIMBS.length.toLocaleString('nl-NL')} climbs visible
                            {trackLoading && <span className="ml-2 text-yellow-400 animate-pulse">· loading track...</span>}
                            {selectedClimb && !trackLoading && (
                                <span className="ml-2 text-yellow-400">· {selectedClimb.name}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nearby toggle */}
                        {userPos ? (
                            <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5">
                                <LocateFixed size={13} className="text-blue-400" />
                                <span className="text-xs text-blue-400 font-bold">Nearby</span>
                                <select
                                    value={nearbyRadius || 100}
                                    onChange={e => setNearbyRadius(Number(e.target.value))}
                                    className="text-xs bg-transparent text-blue-400 outline-none font-bold ml-1"
                                >
                                    {RADIUS_OPTIONS.map(r => (
                                        <option key={r} value={r}>{r} km</option>
                                    ))}
                                </select>
                                <button onClick={clearNearby} aria-label="Clear nearby filter" className="ml-1 text-blue-400 hover:text-blue-200 focus-visible:ring-2 focus-visible:ring-yellow-400 focus:outline-none rounded">
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={locateMe}
                                disabled={locating}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cdborder text-xs font-bold text-cdmuted hover:text-cdtext hover:border-yellow-400 transition-colors"
                            >
                                <LocateFixed size={13} className={locating ? 'animate-pulse text-yellow-400' : ''} />
                                {locating ? 'Locating...' : '📍 Nearby'}
                            </button>
                        )}
                        {locError && <span className="text-xs text-red-400">{locError}</span>}

                        {/* Filters toggle */}
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${showFilters ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400' : 'text-cdmuted border-cdborder hover:text-cdtext'}`}
                        >
                            <Filter size={13} />
                            Filters
                            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    </div>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-cdborder/50 flex flex-wrap gap-4 items-end">
                        {/* Land */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-cdmuted font-bold">Country</span>
                            <div className="flex gap-1.5 flex-wrap max-w-xs">
                                {uniqueCountries.slice(0, 12).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCountryFilter(c)}
                                        className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${countryFilter === c ? 'bg-yellow-400 text-slate-900' : 'bg-cdbg border border-cdborder text-cdmuted hover:text-cdtext'}`}
                                    >
                                        {c === 'All' ? 'All' : <><FlagIcon country={c} size="sm" />{c}</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stijging */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-cdmuted font-bold">Gradient (%)</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" min={0} max={maxGrade} step={0.5}
                                    value={minGrade}
                                    onChange={e => setMinGrade(Number(e.target.value))}
                                    className="w-14 text-center bg-cdbg border border-cdborder rounded px-1 py-1 text-xs text-cdtext outline-none focus:border-yellow-400"
                                />
                                <span className="text-cdmuted text-xs">–</span>
                                <input
                                    type="number" min={minGrade} max={25} step={0.5}
                                    value={maxGrade}
                                    onChange={e => setMaxGrade(Number(e.target.value))}
                                    className="w-14 text-center bg-cdbg border border-cdborder rounded px-1 py-1 text-xs text-cdtext outline-none focus:border-yellow-400"
                                />
                            </div>
                        </div>

                        {/* Reset */}
                        <button
                            onClick={() => { setCountryFilter('All'); setMinGrade(0); setMaxGrade(25); }}
                            className="px-3 py-1.5 rounded border border-cdborder text-xs text-cdmuted hover:text-cdtext transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                )}

                {/* Legenda */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-cdmuted">
                    {Object.entries(CAT_COLORS).map(([cat, color]) => (
                        <span key={cat} className="flex items-center gap-1">
                            <span style={{ background: color, width: 10, height: 10, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.3)', display: 'inline-block' }} />
                            {cat === 'HC' ? 'HC' : `Cat ${cat}`}
                        </span>
                    ))}
                    <span className="flex items-center gap-1">
                        <span style={{ background: '#3b82f6', width: 10, height: 10, borderRadius: '50%', border: '2px solid white', display: 'inline-block' }} />
                        Your location
                    </span>
                </div>
            </div>

            {/* Kaart container */}
            <div className="bg-cdsurface border border-cdborder rounded-xl overflow-hidden">
                <div
                    ref={mapRef}
                    style={{ height: '600px', width: '100%' }}
                />
            </div>
        </div>
    );
};

export default ClimbMap;
