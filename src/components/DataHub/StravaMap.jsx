import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { decodePolyline } from '../../utils/strava';

/**
 * Leaflet kaart die een Strava route-polyline toont op OpenStreetMap tiles.
 * Vereist 'leaflet/dist/leaflet.css' import in main.jsx.
 */
const StravaMap = ({ polyline }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!polyline || !containerRef.current) return;

        // Ruim bestaande kaart op (React StrictMode voert effect twee keer uit)
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
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const line = L.polyline(coords, { color: '#f97316', weight: 3, opacity: 0.85 });
        line.addTo(map);
        map.fitBounds(line.getBounds(), { padding: [16, 16] });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [polyline]);

    return <div ref={containerRef} style={{ height: '200px' }} className="rounded-lg overflow-hidden border border-cdborder/50" />;
};

export default StravaMap;
