import { describe, it, expect } from 'vitest';
import {
    parseClimbfinderSlug,
    findClimbByClimbfinderSlug,
    resolveClimbFromClimbfinderUrl,
} from '../../utils/climbfinderUrl.js';

describe('climbfinderUrl', () => {
    it('parseClimbfinderSlug extracts slug', () => {
        expect(parseClimbfinderSlug('https://climbfinder.com/en/climbs/alpe-d-huez')).toBe('alpe-d-huez');
        expect(parseClimbfinderSlug('climbfinder.com/en/climbs/mont-ventoux-bédoin')).toBe('mont-ventoux-bédoin');
        expect(parseClimbfinderSlug('https://example.com/x')).toBeNull();
    });

    it('findClimbByClimbfinderSlug matches climb url field', () => {
        const climbs = [
            { id: 'fr_alpe', name: 'Alpe', url: 'https://climbfinder.com/en/climbs/alpe-d-huez' },
        ];
        const found = findClimbByClimbfinderSlug('alpe-d-huez', climbs);
        expect(found?.id).toBe('fr_alpe');
    });

    it('resolveClimbFromClimbfinderUrl returns climb when known', () => {
        const climbs = [{ id: 'x', url: 'https://climbfinder.com/en/climbs/test-col' }];
        const { climb, slug } = resolveClimbFromClimbfinderUrl('https://climbfinder.com/en/climbs/test-col', climbs);
        expect(slug).toBe('test-col');
        expect(climb?.id).toBe('x');
    });
});
