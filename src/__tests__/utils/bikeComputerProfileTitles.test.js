import { describe, it, expect } from 'vitest';
import {
    normalizeBikeComputerProfileTitles,
    formatBikeComputerProfileTitlesForInput,
} from '../../utils/bikeComputerProfileTitles';

describe('bikeComputerProfileTitles formatting', () => {
    it('formats array for settings input', () => {
        expect(formatBikeComputerProfileTitlesForInput(['SUPERIOR', 'AETHOS'])).toBe('SUPERIOR, AETHOS');
    });

    it('returns empty array for invalid input', () => {
        expect(normalizeBikeComputerProfileTitles(null)).toEqual([]);
        expect(normalizeBikeComputerProfileTitles('  , ; ')).toEqual([]);
    });
});
