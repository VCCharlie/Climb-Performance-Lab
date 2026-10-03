import { describe, it, expect } from 'vitest';
import {
    getClimbDedupeKeys,
    isClimbMetricsComplete,
    normalizeClimbName,
    pickPreferredClimbRecord,
    processClimbDatabaseRecords,
} from '../../utils/climbDataQuality.js';

describe('climbDataQuality', () => {
    it('isClimbMetricsComplete requires length, grade, and elevation', () => {
        expect(isClimbMetricsComplete({ id: 'a', name: 'X', lengthKm: 10, avgGrade: 5, elevation: 500 })).toBe(true);
        expect(isClimbMetricsComplete({ id: 'a', name: 'X', lengthKm: 10, avgGrade: 0, elevation: 500 })).toBe(false);
        expect(isClimbMetricsComplete({ id: 'a', name: 'X', lengthKm: 10, avgGrade: 5, elevation: 0 })).toBe(false);
    });

    it('normalizeClimbName treats south and -s as equivalent suffix', () => {
        expect(normalizeClimbName("Alpe d'Huez-south ")).toBe(normalizeClimbName("Alpe d'Huez-S"));
    });

    it('pickPreferredClimbRecord prefers curated tier over scrape tier', () => {
        const curated = { id: 'fr_alpe', name: 'Alpe', lengthKm: 13.8, avgGrade: 8, elevation: 1000, score: 100 };
        const scrape = { id: 'sc_x', name: 'Alpe', lengthKm: 14, avgGrade: 8, elevation: 1000, score: 200000 };
        expect(pickPreferredClimbRecord(curated, scrape).id).toBe('fr_alpe');
    });

    it('processClimbDatabaseRecords dedupes by climbfinder slug', () => {
        const climbs = [
            {
                id: 'a',
                name: 'Test',
                country: 'FR',
                lengthKm: 10,
                avgGrade: 7,
                elevation: 700,
                url: 'https://climbfinder.com/en/climbs/test-col',
                score: 100,
            },
            {
                id: 'sc_dup',
                name: 'Test duplicate',
                country: 'FR',
                lengthKm: 10.1,
                avgGrade: 7,
                elevation: 710,
                url: 'https://climbfinder.com/en/climbs/test-col',
                score: 999999,
            },
        ];
        const out = processClimbDatabaseRecords(climbs);
        expect(out.filter((c) => c.dataQuality === 'complete')).toHaveLength(1);
        expect(out[0].id).toBe('a');
    });

    it('getClimbDedupeKeys includes cyclingup path', () => {
        const keys = getClimbDedupeKeys({
            id: 'x',
            name: 'Y',
            country: 'FR',
            lengthKm: 5,
            cuUrl: 'https://cyclingup.eu/english/France_Alps/Alpe_dHuez-south.php',
        });
        expect(keys.some((k) => k.startsWith('cu:'))).toBe(true);
    });
});
