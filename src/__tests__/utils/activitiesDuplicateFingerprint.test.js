import { describe, expect, it } from 'vitest';
import { buildActivitiesDuplicateFingerprint } from '../../utils/activitiesDuplicateFingerprint';

describe('buildActivitiesDuplicateFingerprint', () => {
    it('returns stable fingerprint for identical duplicate-relevant fields', () => {
        const activities = [
            { id: '1', date: '2026-01-01T10:00:00', distance: 42, moving_time: 3600 },
            { id: '2', date: '2026-01-02', distance: 30, moving_time: '1:00:00' },
        ];
        const first = buildActivitiesDuplicateFingerprint(activities);
        const second = buildActivitiesDuplicateFingerprint([...activities]);
        expect(first).toBe(second);
        expect(first).toContain('n:2');
    });

    it('changes when duplicate-relevant fields change', () => {
        const base = [{ id: '1', date: '2026-01-01', distance: 42, moving_time: 3600 }];
        const changed = [{ id: '1', date: '2026-01-01', distance: 43, moving_time: 3600 }];
        expect(buildActivitiesDuplicateFingerprint(base)).not.toBe(
            buildActivitiesDuplicateFingerprint(changed),
        );
    });

    it('returns 0 for empty list', () => {
        expect(buildActivitiesDuplicateFingerprint([])).toBe('0');
    });
});
