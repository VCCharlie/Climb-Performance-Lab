import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import { decodePolyline } from '../../utils/strava';

/**
 * Leaflet kaart die een Strava route-polyline toont op OpenStreetMap tiles.
 * Vereist 'leaflet/dist/leaflet.css' import in main.jsx.
 */
const StravaMap = ({ polyline }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const [expanded, setExpanded] = useState(false);

    const initMap = useCallback(() => {
        if (!polyline || !containerRef.current) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const coords = decodePolyline(polyline);
        if (coords.length === 0) return;

        const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true
        });
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
        }).addTo(map);

        const line = L.polyline(coords, { color: '#f97316', weight: 3, opacity: 0.85 });
        line.addTo(map);
        map.fitBounds(line.getBounds(), { padding: [16, 16] });
    }, [polyline]);

    useEffect(() => {
        initMap();
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [initMap]);

    // Re-initialize map after height change so Leaflet recalculates tile layout
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 50);
        return () => clearTimeout(timeout);
    }, [expanded]);

    const height = expanded ? '420px' : '200px';

    return (
        <div className="relative">
            <div ref={containerRef} style={{ height }} className="rounded-lg overflow-hidden border border-cdborder/50 transition-all duration-300" />
            <button
                onClick={() => setExpanded(e => !e)}
                className="absolute top-2 right-2 z-[500] bg-cdbg/80 hover:bg-cdbg text-cdmuted hover:text-cdtext border border-cdborder/50 rounded p-1 transition-colors"
                title={expanded ? 'Verkleinen' : 'Vergroten'}
            >
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
        </div>
    );
};

export default StravaMap;
