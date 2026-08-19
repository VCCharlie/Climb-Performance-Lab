/**
 * Normalize power/HR stream payloads from Intervals.icu or Strava into aligned arrays.
 */

function extractSeries(streamBlock) {
    if (Array.isArray(streamBlock)) {
        return streamBlock.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    if (streamBlock && Array.isArray(streamBlock.data)) {
        return streamBlock.data.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    }
    return null;
}

function pickStreamValue(payload, keys) {
    if (!payload || typeof payload !== 'object') return null;
    for (const key of keys) {
        if (payload[key] != null) return payload[key];
    }
    return null;
}

/**
 * @param {unknown} payload
 * @param {'intervals' | 'strava'} [source]
 * @returns {{ time: number[], watts: number[], heartrate: number[] } | null}
 */
export function normalizeActivityStreams(payload, source = 'intervals') {
    if (!payload) return null;

    let root = payload;
    if (Array.isArray(payload)) {
        const byType = {};
        for (const entry of payload) {
            const type = String(entry?.type || '').toLowerCase();
            if (!type) continue;
            byType[type] = entry;
        }
        root = byType;
    }

    const timeRaw = pickStreamValue(root, ['time']);
    const wattsRaw = pickStreamValue(root, ['watts', 'power']);
    const hrRaw = pickStreamValue(root, ['heartrate', 'heart_rate', 'hr']);

    const time = extractSeries(timeRaw);
    const watts = extractSeries(wattsRaw);
    const heartrate = extractSeries(hrRaw);

    if (!watts?.length || !heartrate?.length) return null;

    const length = Math.min(
        watts.length,
        heartrate.length,
        time?.length || watts.length,
    );
    if (length < 8) return null;

    const alignedTime = time?.length >= length
        ? time.slice(0, length)
        : Array.from({ length }, (_, i) => i);

    const alignedWatts = watts.slice(0, length);
    const alignedHr = heartrate.slice(0, length);

    const hasPower = alignedWatts.some((v) => v > 0);
    const hasHr = alignedHr.some((v) => v > 0);
    if (!hasPower || !hasHr) return null;

    // Strava may return moving stream separately — caller can pre-filter if needed.
    if (source === 'strava' && root.moving?.data) {
        const moving = extractSeries(root.moving);
        if (moving?.length >= length) {
            const filtered = { time: [], watts: [], heartrate: [] };
            for (let i = 0; i < length; i += 1) {
                if (!moving[i]) continue;
                filtered.time.push(alignedTime[i]);
                filtered.watts.push(alignedWatts[i]);
                filtered.heartrate.push(alignedHr[i]);
            }
            if (filtered.watts.length >= 8) return filtered;
        }
    }

    return {
        time: alignedTime,
        watts: alignedWatts,
        heartrate: alignedHr,
    };
}
