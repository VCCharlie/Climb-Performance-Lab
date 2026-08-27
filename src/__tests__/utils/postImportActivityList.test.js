import { describe, it, expect } from 'vitest';
import { buildPostImportActivityList } from '../../utils/postImportActivityList';

describe('postImportActivityList', () => {
    it('merges incoming activities and removes deleted ids', () => {
        const existing = [
            { id: '1', title: 'Old 1', norm_power: 200 },
            { id: '2', title: 'Remove me' },
        ];
        const incoming = [
            { id: '1', title: 'Updated 1', norm_power: 210 },
            { id: '3', title: 'New' },
        ];

        const merged = buildPostImportActivityList(existing, incoming, ['2']);
        expect(merged).toHaveLength(2);
        expect(merged.find((a) => a.id === '1')?.title).toBe('Updated 1');
        expect(merged.find((a) => a.id === '3')?.title).toBe('New');
        expect(merged.find((a) => a.id === '2')).toBeUndefined();
    });
});
