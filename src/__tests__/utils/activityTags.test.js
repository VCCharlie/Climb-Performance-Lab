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
});
