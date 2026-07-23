import { describe, it, expect } from 'vitest';
import {
    buildClimbMatchIndex,
    findBestClimbForActivityPb,
    isTrustedClimbDescription,
    climbNameAppearsInText,
} from '../../utils/activityClimbMatchPb';
import { findBestClimbForActivity } from '../../utils/activityClimbMatch';

const climbs = [
    { id: 'it_stelvio', name: 'Passo dello Stelvio', country: 'IT' },
    { id: 'fr_alpe', name: "Alpe d'Huez", country: 'FR' },
];

describe('activityClimbMatchPb', () => {
    it('isTrustedClimbDescription recognises MyCols and ClimbFinder exports', () => {
        expect(isTrustedClimbDescription('MyCols: Alpe d Huez')).toBe(true);
        expect(isTrustedClimbDescription('Cols climbed via ClimbFinder')).toBe(true);
        expect(isTrustedClimbDescription('Great weather and coffee')).toBe(false);
    });

    it('climbNameAppearsInText requires the full climb name', () => {
        expect(climbNameAppearsInText('Passo dello Stelvio', 'MyCols: Passo dello Stelvio from Prato')).toBe(true);
        expect(climbNameAppearsInText('Passo dello Stelvio', 'Passed near the Stelvio area')).toBe(false);
    });

    it('matches specific titles and trusted descriptions', () => {
        const idx = buildClimbMatchIndex(climbs);

        const fromTitle = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Alpe d Huez PR attempt',
        }, idx);
        expect(fromTitle.climb?.id).toBe('fr_alpe');
        expect(fromTitle.source).toBe('title');

        const fromDescription = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Sunday ride',
            description: 'MyCols: Passo dello Stelvio from Prato',
        }, idx);
        expect(fromDescription.climb?.id).toBe('it_stelvio');
        expect(fromDescription.source).toBe('description');
    });

    it('rejects loose profiler-style matches that are not PB-safe', () => {
        const idx = buildClimbMatchIndex(climbs);
        const activity = {
            type: 'Ride',
            title: 'Easy ride near Stelvio',
            description: 'Great coffee in Bormio',
        };

        const loose = findBestClimbForActivity(activity, idx);
        const strict = findBestClimbForActivityPb(activity, idx);

        expect(loose.climb?.id).toBe('it_stelvio');
        expect(strict.climb).toBeNull();
    });

    it('rejects description word overlap without trusted export text', () => {
        const idx = buildClimbMatchIndex(climbs);
        const { climb, source } = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Morning ride',
            description: 'Passed near the Stelvio area',
        }, idx);

        expect(climb).toBeNull();
        expect(source).toBeNull();
    });
});
