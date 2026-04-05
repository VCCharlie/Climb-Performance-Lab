import { describe, it, expect } from 'vitest';
import { protectEnrichedFieldsOnMerge } from '../../utils/firestoreActivityMerge';

describe('protectEnrichedFieldsOnMerge', () => {
    it('behoudt bestaande RPE als inkomend 0 is', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Ride', rpe: 0 },
            { id: '1', title: 'Ride', rpe: 7 }
        );
        expect(out.rpe).toBe(7);
    });

    it('overschrijft RPE als inkomend > 0', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Ride', rpe: 8 },
            { id: '1', title: 'Ride', rpe: 7 }
        );
        expect(out.rpe).toBe(8);
    });

    it('behoudt specifieke titel bij generieke Intervals-titel', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Morning Ride', rpe: 0 },
            { id: '1', title: 'Clubrit met pijn', rpe: 0 }
        );
        expect(out.title).toBe('Clubrit met pijn');
    });

    it('neemt betere inkomende titel als bestaande generiek is', () => {
        const out = protectEnrichedFieldsOnMerge(
            { id: '1', title: 'Zware cols', rpe: 0 },
            { id: '1', title: 'Morning Ride', rpe: 0 }
        );
        expect(out.title).toBe('Zware cols');
    });

    it('zonder bestaand document: geen wijziging', () => {
        const inc = { id: '1', title: 'Morning Ride', rpe: 0 };
        expect(protectEnrichedFieldsOnMerge(inc, null)).toEqual(inc);
    });
});
