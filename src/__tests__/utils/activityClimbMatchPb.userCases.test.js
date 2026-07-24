import { describe, it, expect } from 'vitest';
import { buildClimbMatchIndex, findBestClimbForActivityPb } from '../../utils/activityClimbMatchPb';

const userClimbs = [
    { id: 'es_angliru_kort', name: "Alto de l'Angliru (korter)", country: 'ES' },
    { id: 'nl_amerongse', name: 'Amerongse Berg', country: 'NL' },
    { id: 'ch_grande', name: 'Barrage de la Grande-Dixence', country: 'CH' },
    { id: 'be_rome', name: 'Barrage du Ry de Rome-N', country: 'BE' },
];

describe('activityClimbMatchPb user false positives', () => {
    const idx = buildClimbMatchIndex(userClimbs);

    it('does not match korter in title to Angliru (korter)', () => {
        const { climb } = findBestClimbForActivityPb({
            type: 'Ride',
            title: '2e ritje: korter maar sneller. En wat een wind...',
        }, idx);
        expect(climb).toBeNull();
    });

    it('does not match berg in title to Amerongse Berg', () => {
        const { climb } = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Windkracht 5 in je giechel. Dan toch liever een berg...',
        }, idx);
        expect(climb).toBeNull();
    });

    it('does not match grande in title to Grande-Dixence', () => {
        const { climb } = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Route de la Grande Chaîne Cassée',
        }, idx);
        expect(climb).toBeNull();
    });

    it('does not match Rome in title to Ry de Rome', () => {
        const { climb } = findBestClimbForActivityPb({
            type: 'Ride',
            title: 'Fiets. Rome. Top! Met Lies!',
        }, idx);
        expect(climb).toBeNull();
    });
});
