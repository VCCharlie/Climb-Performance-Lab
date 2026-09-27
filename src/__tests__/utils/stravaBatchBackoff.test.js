import { describe, it, expect, vi } from 'vitest';
import { runInBatchesWithStravaBackoff, sleepMs } from '../../utils/stravaBatchBackoff';

describe('stravaBatchBackoff', () => {
    it('sleepMs resolves', async () => {
        const t0 = Date.now();
        await sleepMs(20);
        expect(Date.now() - t0).toBeGreaterThanOrEqual(15);
    });

    it('pauses after rate limit hit in stats', async () => {
        const stats = { rateLimitHits: 0 };
        const onBackoff = vi.fn();
        const items = [1, 2, 3];
        let call = 0;
        await runInBatchesWithStravaBackoff(items, 1, async (item) => {
            call += 1;
            if (item === 1) stats.rateLimitHits += 1;
            return item;
        }, { stats, backoffMs: 10, onBackoff });

        expect(call).toBe(3);
        expect(onBackoff).toHaveBeenCalled();
    });
});
