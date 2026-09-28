/**
 * Batch processing with pause when Strava returns 429 during bulk enrich.
 */

export const DEFAULT_STRAVA_BATCH_BACKOFF_MS = 15_000;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleepMs(ms) {
    const n = Math.max(0, Number(ms) || 0);
    if (n === 0) return Promise.resolve();
    return new Promise((resolve) => {
        setTimeout(resolve, n);
    });
}

/**
 * Like runInBatches, but waits and reduces concurrency after rate-limit hits in a batch.
 *
 * @param {Array} items
 * @param {number} batchSize
 * @param {(item: unknown) => Promise<unknown>} taskFn
 * @param {{
 *   stats?: { rateLimitHits?: number },
 *   backoffMs?: number,
 *   minBatchSize?: number,
 *   onBackoff?: (delayMs: number, totalRateLimitHits: number) => void,
 * }} [opts]
 */
export async function runInBatchesWithStravaBackoff(items, batchSize, taskFn, opts = {}) {
    const list = items || [];
    const stats = opts.stats || {};
    const backoffMs = opts.backoffMs ?? DEFAULT_STRAVA_BATCH_BACKOFF_MS;
    const minBatch = Math.max(1, opts.minBatchSize ?? 1);
    let currentBatchSize = Math.max(minBatch, Math.min(5, batchSize || 1));
    const results = [];

    for (let i = 0; i < list.length; ) {
        if (i > 0 && (stats.rateLimitHits || 0) > 0) {
            opts.onBackoff?.(backoffMs, stats.rateLimitHits || 0);
            await sleepMs(backoffMs);
            currentBatchSize = Math.max(minBatch, Math.floor(currentBatchSize / 2));
        }

        const hitsBefore = stats.rateLimitHits || 0;
        const batch = list.slice(i, i + currentBatchSize);
        const batchResults = await Promise.all(batch.map((item) => taskFn(item)));
        results.push(...batchResults);
        i += batch.length;

        if ((stats.rateLimitHits || 0) > hitsBefore) {
            currentBatchSize = Math.max(minBatch, Math.floor(currentBatchSize / 2));
        }
    }

    return results;
}
