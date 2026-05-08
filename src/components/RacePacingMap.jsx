/**
 * src/components/RacePacingMap.jsx
 * Mini-kaart voor Race Pacing: toont geselecteerde klimmen + OSRM fietsroute ertussen.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';

// OSRM public cycling endpoint (geen API key nodig)
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/cycling';

const CAT_COLORS = {
    HC: '#ffffff',
    '1': '#ef4444',
    '2': '#f97316',
    '3': '#eab308',
    '4': '#22c55e',
};

const numberIcon = (n, catColor) => L.divIcon({
    className: '',
    html: `<div style="
        width: 26px; height: 26px;
        background: ${catColor};
        border: 2px solid rgba(0,0,0,0.6);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 11px; color: #1e293b;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        font-family: system-ui, sans-serif;
    ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

/**
 * Haal OSRM fietsroute op tussen twee punten.
 * @returns {Array} GeoJSON LineString coördinaten [[lon,lat], ...]
 */
const fetchOsrmRoute = async (from, to) => {
    const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
    try {
        const res = await fetch(
            `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.routes?.[0]?.geometry?.coordinates ?? null;
    } catch {
        return null;
    }
};

const RacePacingMap = ({ climbs }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layersRef = useRef([]);
    const abortRef = useRef(false);

    // Init kaart
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Herbouw markers + routes bij klimwijziging
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        abortRef.current = false;

        // Verwijder bestaande lagen
        layersRef.current.forEach(l => l.remove());
        layersRef.current = [];

        const validClimbs = climbs.filter(c => c.lat != null && c.lon != null);
        if (validClimbs.length === 0) return;

        // Markers
        validClimbs.forEach((climb, idx) => {
            const { label } = (() => {
                const score = climb.lengthKm * climb.avgGrade * (climb.avgGrade > 10 ? 1.25 : 1);
                if (score > 100 || (climb.lengthKm > 15 && climb.avgGrade > 6)) return { label: 'HC' };
                if (score > 60) return { label: '1' };
                if (score > 35) return { label: '2' };
                if (score > 16) return { label: '3' };
                return { label: '4' };
            })();

            const marker = L.marker([climb.lat, climb.lon], {
                icon: numberIcon(idx + 1, CAT_COLORS[label] || '#94a3b8'),
                zIndexOffset: 500,
            })
                .bindPopup(
                    `<div style="font-family:system-ui;min-width:140px">
                        <strong style="font-size:13px;">${idx + 1}. ${climb.name}</strong>
                        <div style="color:#666;font-size:11px;margin-top:3px;">
                            📏 ${climb.lengthKm} km &nbsp;|&nbsp; 📐 ${climb.avgGrade}% &nbsp;|&nbsp; ⛰️ ${climb.elevation}m
                        </div>
                    </div>`
                )
                .addTo(map);
            layersRef.current.push(marker);
        });

        // Fit kaart aan klimmen
        const bounds = L.latLngBounds(validClimbs.map(c => [c.lat, c.lon]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });

        // OSRM routes ophalen tussen opeenvolgende klimmen
        const drawRoutes = async () => {
            for (let i = 0; i < validClimbs.length - 1; i++) {
                if (abortRef.current) break;

                const from = validClimbs[i];
                const to = validClimbs[i + 1];
                const coords = await fetchOsrmRoute(from, to);

                if (abortRef.current) break;

                if (coords) {
                    // OSRM geeft [lon, lat] — Leaflet wil [lat, lon]
                    const latlngs = coords.map(([lon, lat]) => [lat, lon]);
                    const line = L.polyline(latlngs, {
                        color: '#3b82f6',
                        weight: 3,
                        opacity: 0.75,
                        dashArray: '6, 4',
                    }).addTo(map);
                    layersRef.current.push(line);
                } else {
                    // Fallback: rechte lijn als OSRM niet bereikbaar is
                    const line = L.polyline(
                        [[from.lat, from.lon], [to.lat, to.lon]],
                        { color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '4, 6' }
                    ).addTo(map);
                    layersRef.current.push(line);
                }
            }
        };

        drawRoutes();

        return () => { abortRef.current = true; };
    }, [climbs]);

    return (
        <div
            ref={mapRef}
            style={{ height: '320px', width: '100%' }}
            className="rounded-b-lg"
        />
    );
};

export default RacePacingMap;
