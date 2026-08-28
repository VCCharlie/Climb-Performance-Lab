import { describe, it, expect } from 'vitest';
import {
    normalizeActivityTags,
    activityHasTags,
    activityMatchesTagSearch,
    formatTagsForInput,
    protectActivityTagsOnMerge,
} from '../../utils/activityTags';

describe('activityTags', () => {
    it('normalizes comma-separated tags to lowercase unique list', () => {
        expect(normalizeActivityTags('Race, training, Race')).toEqual(['race', 'training']);
    });

    it('accepts string arrays', () => {
        expect(normalizeActivityTags(['Hill', 'HILL'])).toEqual(['hill']);
    });

    it('detects tagged activities', () => {
        expect(activityHasTags({ tags: ['coffee'] })).toBe(true);
        expect(activityHasTags({})).toBe(false);
    });

    it('matches tag search substring', () => {
        expect(activityMatchesTagSearch({ tags: ['gran-fondo'] }, 'gran')).toBe(true);
        expect(activityMatchesTagSearch({ tags: ['race'] }, 'training')).toBe(false);
    });

    it('formats tags for input field', () => {
        expect(formatTagsForInput(['a', 'b'])).toBe('a, b');
    });

    it('protects tags on merge when incoming omits them', () => {
        const out = { title: 'Ride' };
        protectActivityTagsOnMerge({ title: 'Ride' }, { tags: ['camp'], user_notes: 'Hard day' }, out);
        expect(out.tags).toEqual(['camp']);
        expect(out.user_notes).toBe('Hard day');
    });

    it('allows clearing all tags when incoming explicitly sends an empty array', () => {
        const out = { title: 'Ride', tags: ['race'] };
        protectActivityTagsOnMerge(
            { title: 'Ride', tags: [] },
            { tags: ['race', 'hilly'] },
            out,
        );
        expect(out.tags).toEqual([]);
    });

    it('allows removing individual tags when incoming sends the reduced list', () => {
        const out = {};
        protectActivityTagsOnMerge(
            { tags: ['race'] },
            { tags: ['race', 'hilly'] },
            out,
        );
        expect(out.tags).toEqual(['race']);
    });

    it('allows clearing user notes when incoming explicitly sends an empty string', () => {
        const out = { user_notes: 'Old note' };
        protectActivityTagsOnMerge(
            { user_notes: '' },
            { user_notes: 'Old note' },
            out,
        );
        expect(out.user_notes).toBe('');
    });
});
