import { useEffect, useState } from 'react';
import { loadLeaflet } from '../utils/loadLeaflet';

/**
 * Resolves Leaflet after dynamic import (CSS + default marker icons).
 * @returns {import('leaflet') | null}
 */
export function useLeaflet() {
    const [leaflet, setLeaflet] = useState(null);

    useEffect(() => {
        let cancelled = false;
        loadLeaflet().then((L) => {
            if (!cancelled) setLeaflet(L);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return leaflet;
}
