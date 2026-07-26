import { describe, it, expect } from 'vitest';
import {
    normalizeDismissedPbClimbIds,
    unionDismissedPbClimbIds,
    climbPbsWithoutDismissed,
    addDismissedPbClimbId,
} from '../../utils/bucketListPbDismiss';

describe('bucketListPbDismiss', () => {
    it('normalizes dismissed ids', () => {
        expect(normalizeDismissedPbClimbIds(['a', 'a', '', null, 'b'])).toEqual(['a', 'b']);
    });

    it('unions dismissed lists from local and cloud', () => {
        const merged = unionDismissedPbClimbIds(['es_angliru'], ['ch_grande_dixence', 'es_angliru']);
        expect(merged.sort()).toEqual(['ch_grande_dixence', 'es_angliru']);
    });

    it('strips dismissed climbs from climbPbs', () => {
        const next = climbPbsWithoutDismissed(
            { es_angliru: { normPower: 200 }, fr_alpe: { normPower: 280 } },
            ['es_angliru'],
        );
        expect(next.es_angliru).toBeUndefined();
        expect(next.fr_alpe?.normPower).toBe(280);
    });

    it('addDismissedPbClimbId appends without duplicates', () => {
        expect(addDismissedPbClimbId(['a'], 'b')).toEqual(['a', 'b']);
        expect(addDismissedPbClimbId(['a'], 'a')).toEqual(['a']);
    });
});
