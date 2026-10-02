/**
 * Parse GPX track points into climb profile samples (browser-safe XML).
 */
import { haversineDistance } from './calculations.js';

const MAX_POINTS_DEFAULT = 500;

/**
 * @param {string} xmlText
 * @returns {Document}
 */
function parseGpxDocument(xmlText) {
    if (typeof DOMParser === 'undefined') {
        throw new Error('GPX parsing requires DOMParser (browser environment).');
    }
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) {
        throw new Error('Invalid GPX file (XML parse error).');
    }
    return doc;
}

/**
 * @param {Document} doc
 * @returns {{ lat: number, lon: number, ele: number }[]}
 */
function extractTrackPoints(doc) {
    /** @type {{ lat: number, lon: number, ele: number }[]} */
    const points = [];
    const nodes = doc.querySelectorAll('trkpt, rtept, wpt');
    nodes.forEach((node) => {
        const lat = Number(node.getAttribute('lat'));
        const lon = Number(node.getAttribute('lon'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const eleNode = node.querySelector('ele');
        const ele = eleNode ? Number(eleNode.textContent) : NaN;
        if (!Number.isFinite(ele)) return;
        points.push({ lat, lon, ele });
    });
    return points;
}

/**
 * @param {{ lat: number, lon: number, ele: number }[]} samples
 * @param {number} maxPoints
 */
export function downsampleTrackSamples(samples, maxPoints = MAX_POINTS_DEFAULT) {
    if (!samples?.length || samples.length <= maxPoints) return samples || [];
    const step = samples.length / maxPoints;
    const out = [];
    for (let i = 0; i < maxPoints; i += 1) {
        const idx = Math.min(samples.length - 1, Math.floor(i * step));
        out.push(samples[idx]);
    }
    if (out[out.length - 1] !== samples[samples.length - 1]) {
        out.push(samples[samples.length - 1]);
    }
    return out;
}

/**
 * @param {{ lat: number, lon: number, ele: number }[]} samples
 * @returns {{ distanceKm: number, elevation: number, gradient: number, progress: number }[]}
 */
export function trackSamplesToProfilePoints(samples) {
    if (!samples?.length) return [];

    let cumulativeKm = 0;
    /** @type {{ distanceKm: number, elevation: number, gradient: number, progress: number }[]} */
    const profile = [];

    for (let i = 0; i < samples.length; i += 1) {
        const { lat, lon, ele } = samples[i];
        if (i > 0) {
            const prev = samples[i - 1];
            cumulativeKm += haversineDistance(prev.lat, prev.lon, lat, lon);
        }

        let gradient = 0;
        if (i > 0) {
            const prev = samples[i - 1];
            const distKm = haversineDistance(prev.lat, prev.lon, lat, lon);
            const elevDelta = ele - prev.ele;
            if (distKm > 0.001) {
                gradient = (elevDelta / (distKm * 1000)) * 100;
            }
        }

        profile.push({
            distance: cumulativeKm,
            distanceKm: cumulativeKm,
            elevation: ele,
            gradient: Math.max(-25, Math.min(25, gradient)),
            progress: 0,
        });
    }

    const total = profile[profile.length - 1]?.distanceKm || 0;
    if (total > 0) {
        profile.forEach((p) => {
            p.progress = (p.distanceKm / total) * 100;
        });
    }

    return profile;
}

/**
 * @param {string} xmlText
 * @param {{ maxPoints?: number }} [options]
 * @returns {{ points: ReturnType<typeof trackSamplesToProfilePoints>, pointCount: number, totalDistanceKm: number, elevationGainM: number }}
 */
export function parseGpxToProfilePoints(xmlText, options = {}) {
    const maxPoints = options.maxPoints ?? MAX_POINTS_DEFAULT;
    const doc = parseGpxDocument(String(xmlText || ''));
    const raw = extractTrackPoints(doc);
    if (raw.length < 2) {
        throw new Error('GPX has no elevation track points (need at least 2 trkpt/rtept with <ele>).');
    }

    const sampled = downsampleTrackSamples(raw, maxPoints);
    const points = trackSamplesToProfilePoints(sampled);

    let elevationGainM = 0;
    for (let i = 1; i < sampled.length; i += 1) {
        const d = sampled[i].ele - sampled[i - 1].ele;
        if (d > 0) elevationGainM += d;
    }

    const totalDistanceKm = points[points.length - 1]?.distanceKm ?? 0;

    return {
        points,
        pointCount: points.length,
        totalDistanceKm,
        elevationGainM: Math.round(elevationGainM),
    };
}
