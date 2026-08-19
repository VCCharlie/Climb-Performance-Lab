/**
 * Climb map marker indexing — viewport culling + grid clustering (Bolt 2.6).
 * No external dependencies; falls back to capped direct markers on errors.
 */

/** Above this count at high zoom we still cap direct markers (fail-safe). */
export const CLIMB_MAP_MAX_DIRECT_MARKERS = 800;

/** Below this zoom, grid clusters are used when climb count is high. */
export const CLIMB_MAP_CLUSTER_ZOOM_THRESHOLD = 9;

/** Start clustering when filtered climbs exceed this count. */
export const CLIMB_MAP_CLUSTER_COUNT_THRESHOLD = 120;

/**
 * @typedef {{ north: number, south: number, east: number, west: number }} MapBounds
 * @typedef {{ id: string, name: string, lat: number, lon: number, [key: string]: unknown }} ClimbPoint
 * @typedef {{ kind: 'single', climb: ClimbPoint }} SingleMarkerItem
 * @typedef {{ kind: 'cluster', lat: number, lon: number, count: number, climbs: ClimbPoint[] }} ClusterMarkerItem
 * @typedef {SingleMarkerItem | ClusterMarkerItem} ClimbMapDisplayItem
 */

/**
 * @param {number} zoom
 * @returns {number} degrees per grid cell
 */
export function gridCellSizeForZoom(zoom) {
    if (!Number.isFinite(zoom)) return 0.4;
    if (zoom >= 12) return 0.025;
    if (zoom >= 10) return 0.06;
    if (zoom >= 8) return 0.18;
    return 0.45;
}

/**
 * @param {number} lat
 * @param {number} lon
 * @param {number} cellSize
 */
export function gridCellKey(lat, lon, cellSize) {
    const size = cellSize > 0 ? cellSize : 0.45;
    return `${Math.floor(lat / size)}:${Math.floor(lon / size)}`;
}

/**
 * @param {MapBounds | null | undefined} bounds
 * @param {ClimbPoint} climb
 */
export function climbInBounds(bounds, climb) {
    if (!bounds) return true;
    const lat = Number(climb?.lat);
    const lon = Number(climb?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

    const { north, south, east, west } = bounds;
    if (lat < south || lat > north) return false;

    // Handle antimeridian wrap loosely — European climbs only need simple compare.
    if (west <= east) {
        return lon >= west && lon <= east;
    }
    return lon >= west || lon <= east;
}

/**
 * @param {ClimbPoint[]} climbs
 * @param {MapBounds | null | undefined} bounds
 */
export function filterClimbsToBounds(climbs, bounds) {
    if (!bounds || !climbs?.length) return climbs || [];
    return climbs.filter((c) => climbInBounds(bounds, c));
}

/**
 * @param {ClimbPoint[]} climbs
 * @param {number} cellSize
 * @returns {ClusterMarkerItem[]}
 */
export function clusterClimbsByGrid(climbs, cellSize) {
    const buckets = new Map();
    for (const climb of climbs || []) {
        const lat = Number(climb?.lat);
        const lon = Number(climb?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

        const key = gridCellKey(lat, lon, cellSize);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(climb);
    }

    const clusters = [];
    for (const group of buckets.values()) {
        if (!group.length) continue;
        const lat = group.reduce((sum, c) => sum + Number(c.lat), 0) / group.length;
        const lon = group.reduce((sum, c) => sum + Number(c.lon), 0) / group.length;
        if (group.length === 1) {
            clusters.push({ kind: 'single', climb: group[0] });
        } else {
            clusters.push({
                kind: 'cluster',
                lat,
                lon,
                count: group.length,
                climbs: group,
            });
        }
    }
    return clusters;
}

/**
 * Build display items for the map layer with fail-safe caps.
 * @param {ClimbPoint[]} climbs
 * @param {{ zoom?: number, bounds?: MapBounds | null, maxDirect?: number }} [options]
 * @returns {{ items: ClimbMapDisplayItem[], mode: 'direct' | 'cluster' | 'capped', totalInput: number }}
 */
export function buildClimbMapDisplayItems(climbs, options = {}) {
    const input = Array.isArray(climbs) ? climbs : [];
    const zoom = Number(options.zoom) || 6;
    const bounds = options.bounds ?? null;
    const maxDirect = options.maxDirect ?? CLIMB_MAP_MAX_DIRECT_MARKERS;

    try {
        const inView = filterClimbsToBounds(input, bounds);
        const shouldCluster = zoom < CLIMB_MAP_CLUSTER_ZOOM_THRESHOLD
            || inView.length > CLIMB_MAP_CLUSTER_COUNT_THRESHOLD;

        if (shouldCluster && inView.length > 0) {
            const cellSize = gridCellSizeForZoom(zoom);
            const clustered = clusterClimbsByGrid(inView, cellSize);
            const cappedItems = clustered.length > maxDirect
                ? clustered.slice(0, maxDirect)
                : clustered;
            return {
                items: cappedItems,
                mode: clustered.length > maxDirect ? 'capped' : 'cluster',
                totalInput: input.length,
            };
        }

        const capped = inView.length > maxDirect ? inView.slice(0, maxDirect) : inView;
        const items = capped.map((climb) => ({ kind: 'single', climb }));
        return {
            items,
            mode: inView.length > maxDirect ? 'capped' : 'direct',
            totalInput: input.length,
        };
    } catch {
        const fallback = input
            .filter((c) => Number.isFinite(Number(c?.lat)) && Number.isFinite(Number(c?.lon)))
            .slice(0, Math.min(maxDirect, 200));
        return {
            items: fallback.map((climb) => ({ kind: 'single', climb })),
            mode: 'capped',
            totalInput: input.length,
        };
    }
}

/**
 * Safe wrapper for Leaflet bounds → MapBounds.
 * @param {import('leaflet').LatLngBounds | null | undefined} leafletBounds
 * @returns {MapBounds | null}
 */
export function mapBoundsFromLeaflet(leafletBounds) {
    try {
        if (!leafletBounds?.isValid?.()) return null;
        const northWest = leafletBounds.getNorthWest();
        const southEast = leafletBounds.getSouthEast();
        return {
            north: northWest.lat,
            south: southEast.lat,
            east: southEast.lng,
            west: northWest.lng,
        };
    } catch {
        return null;
    }
}
