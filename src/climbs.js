/**
 * src/climbs.js
 * Core climb data for Climb Performance Lab (main bundle).
 *
 * Full real-world database (~3300 climbs) lives in climbs_extended.js and loads on demand.
 * Zwift / portal climbs ship here so Physics and selectors work before the chunk loads.
 */

export { COGGAN_ZONES } from './cogganZones.js';
import { processClimbDatabaseRecords } from './utils/climbDataQuality.js';

const getClimbUrl = (name, country) => {
    if (country === 'ZWIFT') return `https://zwiftinsider.com/?s=${name.replace(/\s+/g, '+')}`;
    return `https://climbfinder.com/en/climbs/${name.toLowerCase().replace(/[\s/().']+/g, '-').replace(/-+$/, '')}`;
};

const withClimbUrl = (c) => ({
    ...c,
    url: c.url || getClimbUrl(c.name, c.country),
});

// Zwift-klimmen die niet in climbs_extended.js zitten (66 stuks)
const ZWIFT_EXTRA = [
    { id: 'zw_alpe', name: "Alpe du Zwift", country: "ZWIFT", region: "Watopia", lengthKm: 12.2, elevation: 1036, avgGrade: 8.5 },
    { id: 'zw_epic', name: "Epic KOM", country: "ZWIFT", region: "Watopia", lengthKm: 9.4, elevation: 540, avgGrade: 5.9 },
    { id: 'zw_epic_rev', name: "Epic KOM Reverse", country: "ZWIFT", region: "Watopia", lengthKm: 6.2, elevation: 364, avgGrade: 5.9 },
    { id: 'zw_radio', name: "Radio Tower", country: "ZWIFT", region: "Watopia", lengthKm: 1.1, elevation: 150, avgGrade: 13.7 },
    { id: 'zw_volcano', name: "Volcano KOM", country: "ZWIFT", region: "Watopia", lengthKm: 3.75, elevation: 120, avgGrade: 3.2 },
    { id: 'zw_hilly', name: "Hilly KOM", country: "ZWIFT", region: "Watopia", lengthKm: 0.9, elevation: 50, avgGrade: 5.5 },
    { id: 'zw_hilly_rev', name: "Hilly KOM Reverse", country: "ZWIFT", region: "Watopia", lengthKm: 2.5, elevation: 49, avgGrade: 1.8 },
    { id: 'z_titans', name: "Titans Grove KOM", country: "ZWIFT", region: "Watopia", lengthKm: 2.6, elevation: 119, avgGrade: 4.6 },
    { id: 'zw_ven_top', name: "Ven-Top", country: "ZWIFT", region: "France", lengthKm: 20.9, elevation: 1534, avgGrade: 7.3 },
    { id: 'zw_petit_kom', name: "Petit KOM", country: "ZWIFT", region: "France", lengthKm: 2.7, elevation: 106, avgGrade: 4.0 },
    { id: 'zw_innsbruck', name: "Innsbruck KOM", country: "ZWIFT", region: "Innsbruck", lengthKm: 7.4, elevation: 400, avgGrade: 5.4 },
    { id: 'z_igls', name: "Igls (Reverse)", country: "ZWIFT", region: "Innsbruck", lengthKm: 5.6, elevation: 230, avgGrade: 4.1 },
    { id: 'zw_box_hill', name: "Box Hill", country: "ZWIFT", region: "London", lengthKm: 3.0, elevation: 137, avgGrade: 4.3 },
    { id: 'zw_leith_hill', name: "Leith Hill", country: "ZWIFT", region: "London", lengthKm: 1.9, elevation: 134, avgGrade: 6.8 },
    { id: 'zw_keith_hill', name: "Keith Hill", country: "ZWIFT", region: "London", lengthKm: 4.2, elevation: 228, avgGrade: 5.2 },
    { id: 'zw_fox_hill', name: "Fox Hill", country: "ZWIFT", region: "London", lengthKm: 2.4, elevation: 118, avgGrade: 4.9 },
    { id: 'zw_ny_kom', name: "New York KOM", country: "ZWIFT", region: "New York", lengthKm: 1.4, elevation: 89, avgGrade: 6.1 },
    { id: 'zw_richmond_kom', name: "Richmond KOM", country: "ZWIFT", region: "Richmond", lengthKm: 0.28, elevation: 19, avgGrade: 6.5 },
    { id: 'zw_richmond_23', name: "23rd Street", country: "ZWIFT", region: "Richmond", lengthKm: 0.27, elevation: 26, avgGrade: 10.0 },
    { id: 'zw_bologna', name: "San Luca (Bologna)", country: "ZWIFT", region: "Bologna", lengthKm: 2.0, elevation: 218, avgGrade: 10.8 },
    { id: 'zw_sgurr', name: "Sgurr Summit", country: "ZWIFT", region: "Scotland", lengthKm: 3.3, elevation: 113, avgGrade: 3.4 },
    { id: 'zw_yorkshire', name: "Yorkshire KOM", country: "ZWIFT", region: "Yorkshire", lengthKm: 1.2, elevation: 55, avgGrade: 5.5 },
    { id: 'zw_temple', name: "Temple KOM", country: "ZWIFT", region: "Makuri Islands", lengthKm: 1.9, elevation: 64, avgGrade: 3.6 },
    { id: 'zw_rooftop', name: "Rooftop KOM", country: "ZWIFT", region: "Makuri Islands", lengthKm: 1.87, elevation: 80, avgGrade: 4.3 },
    { id: 'zw_castle', name: "Castle KOM", country: "ZWIFT", region: "Makuri Islands", lengthKm: 2.7, elevation: 68, avgGrade: 2.5 },
    { id: 'zp_pike', name: "Cote de Pike", country: "ZWIFT", region: "Climb Portal", lengthKm: 2.0, elevation: 200, avgGrade: 10.0 },
    { id: 'zp_puy_dome', name: "Puy de Dôme", country: "ZWIFT", region: "Climb Portal", lengthKm: 10.5, elevation: 882, avgGrade: 8.4 },
    { id: 'zp_superplanche', name: "Superplanche", country: "ZWIFT", region: "Climb Portal", lengthKm: 7.0, elevation: 614, avgGrade: 8.7 },
    { id: 'zp_couillole', name: "Col de la Couillole", country: "ZWIFT", region: "Climb Portal", lengthKm: 15.8, elevation: 1157, avgGrade: 7.3 },
    { id: 'zp_eze', name: "Col d'Eze", country: "ZWIFT", region: "Climb Portal", lengthKm: 10.0, elevation: 501, avgGrade: 4.9 },
    { id: 'zp_willunga', name: "Old Willunga Hill", country: "ZWIFT", region: "Climb Portal", lengthKm: 3.0, elevation: 227, avgGrade: 7.6 },
    { id: 'zp_crow_road', name: "Crow Road", country: "ZWIFT", region: "Climb Portal", lengthKm: 5.6, elevation: 273, avgGrade: 4.8 },
    { id: 'zp_fuji', name: "Mt. Fuji (Subaru Line)", country: "ZWIFT", region: "Climb Portal", lengthKm: 22.2, elevation: 1182, avgGrade: 5.3 },
    { id: 'zp_rocacorba', name: "Rocacorba", country: "ZWIFT", region: "Climb Portal", lengthKm: 10.0, elevation: 650, avgGrade: 6.5 },
    { id: 'zp_aravis', name: "Col des Aravis", country: "ZWIFT", region: "Climb Portal", lengthKm: 4.4, elevation: 257, avgGrade: 5.8 },
    { id: 'zp_domancy', name: "Cote de Domancy", country: "ZWIFT", region: "Climb Portal", lengthKm: 2.6, elevation: 218, avgGrade: 8.4 },
    { id: 'zp_valparola', name: "Passo Valparola", country: "ZWIFT", region: "Climb Portal", lengthKm: 13.9, elevation: 813, avgGrade: 5.8 },
    { id: 'zp_bealach', name: "Bealach na Bà", country: "ZWIFT", region: "Portal", lengthKm: 9.0, elevation: 632, avgGrade: 7.0 },
    { id: 'zp_cauberg', name: "Cauberg", country: "ZWIFT", region: "Portal", lengthKm: 0.8, elevation: 57, avgGrade: 7.1 },
    { id: 'zp_cheddar', name: "Cheddar Gorge", country: "ZWIFT", region: "Portal", lengthKm: 4.7, elevation: 171, avgGrade: 3.6 },
    { id: 'zp_cipressa', name: "Cipressa", country: "ZWIFT", region: "Portal", lengthKm: 6.4, elevation: 228, avgGrade: 3.5 },
    { id: 'zp_croix', name: "Col de la Croix Saint-Robert", country: "ZWIFT", region: "Portal", lengthKm: 5.7, elevation: 346, avgGrade: 6.1 },
    { id: 'zp_madeleine', name: "Col de la Madeleine", country: "ZWIFT", region: "Portal", lengthKm: 14.3, elevation: 1118, avgGrade: 7.8 },
    { id: 'zp_madone', name: "Col de la Madone", country: "ZWIFT", region: "Portal", lengthKm: 16.3, elevation: 902, avgGrade: 5.5 },
    { id: 'zp_peyresourde', name: "Col de Peyresourde", country: "ZWIFT", region: "Portal", lengthKm: 8.3, elevation: 559, avgGrade: 6.7 },
    { id: 'zp_platzer', name: "Col du Platzerwasel", country: "ZWIFT", region: "Portal", lengthKm: 7.8, elevation: 592, avgGrade: 7.3 },
    { id: 'zp_rosier', name: "Col du Rosier", country: "ZWIFT", region: "Portal", lengthKm: 5.0, elevation: 222, avgGrade: 4.5 },
    { id: 'zp_ordino', name: "Coll d'Ordino", country: "ZWIFT", region: "Portal", lengthKm: 10.3, elevation: 511, avgGrade: 5.0 },
    { id: 'zp_redoute', name: "Côte de La Redoute", country: "ZWIFT", region: "Portal", lengthKm: 1.5, elevation: 153, avgGrade: 10.2 },
    { id: 'zp_trebiac', name: "Cote de Trebiac", country: "ZWIFT", region: "Portal", lengthKm: 4.6, elevation: 207, avgGrade: 4.2 },
    { id: 'zp_forche', name: "Côte des Forche", country: "ZWIFT", region: "Portal", lengthKm: 3.0, elevation: 148, avgGrade: 4.9 },
    { id: 'zp_hardknott', name: "Hardknott Pass", country: "ZWIFT", region: "Portal", lengthKm: 2.7, elevation: 306, avgGrade: 11.5 },
    { id: 'zp_isola', name: "Isola 2000", country: "ZWIFT", region: "Portal", lengthKm: 18.9, elevation: 1145, avgGrade: 5.9 },
    { id: 'zp_laguna', name: "La Laguna Negra", country: "ZWIFT", region: "Portal", lengthKm: 9.1, elevation: 510, avgGrade: 5.6 },
    { id: 'zp_turbie', name: "La Turbie + Col d'Eze", country: "ZWIFT", region: "Portal", lengthKm: 15.2, elevation: 616, avgGrade: 3.1 },
    { id: 'zp_lagos', name: "Lagos de Covadonga", country: "ZWIFT", region: "Portal", lengthKm: 14.5, elevation: 976, avgGrade: 6.7 },
    { id: 'zp_chinaillon', name: "Montée du Chinaillon", country: "ZWIFT", region: "Portal", lengthKm: 8.1, elevation: 353, avgGrade: 4.4 },
    { id: 'zp_hamilton', name: "Mt. Hamilton", country: "ZWIFT", region: "Portal", lengthKm: 31.3, elevation: 1259, avgGrade: 3.5 },
    { id: 'zp_mur_bretagne', name: "Mûr de Bretagne", country: "ZWIFT", region: "Portal", lengthKm: 2.0, elevation: 129, avgGrade: 6.6 },
    { id: 'zp_norton', name: "Norton Summit", country: "ZWIFT", region: "Portal", lengthKm: 8.7, elevation: 363, avgGrade: 4.0 },
    { id: 'zp_old_la_honda', name: "Old La Honda", country: "ZWIFT", region: "Portal", lengthKm: 5.6, elevation: 396, avgGrade: 7.1 },
    { id: 'zp_kwaremont', name: "Oude Kwaremont", country: "ZWIFT", region: "Portal", lengthKm: 1.5, elevation: 64, avgGrade: 4.3 },
    { id: 'zp_peyrol', name: "Pas de Peyrol/Puy Mary", country: "ZWIFT", region: "Portal", lengthKm: 10.2, elevation: 603, avgGrade: 5.9 },
    { id: 'zp_pla_adet', name: "Pla d'Adet", country: "ZWIFT", region: "Portal", lengthKm: 12.1, elevation: 847, avgGrade: 6.9 },
    { id: 'zp_poggio', name: "Poggio", country: "ZWIFT", region: "Portal", lengthKm: 4.3, elevation: 136, avgGrade: 3.2 },
    { id: 'zp_trollstigen', name: "Trollstigen", country: "ZWIFT", region: "Portal", lengthKm: 12.4, elevation: 784, avgGrade: 6.3 },
];

/** Zwift climbs in the main bundle — available before async extended load. */
export const CORE_CLIMB_DATABASE = ZWIFT_EXTRA.map(withClimbUrl);

/** Bump when climbs_extended.js changes materially — invalidates IndexedDB snapshot. */
export const CLIMB_DATABASE_STORAGE_REVISION = '2026-10-03-climb-quality';

/**
 * Merge extended real-world climbs with Zwift extras (dedupe by id).
 * @param {object[]} extendedClimbs
 * @returns {object[]}
 */
export function buildFullClimbDatabase(extendedClimbs) {
    const byId = new Map();
    for (const c of extendedClimbs || []) {
        if (c?.id) byId.set(c.id, withClimbUrl(c));
    }
    for (const c of ZWIFT_EXTRA) {
        if (!byId.has(c.id)) byId.set(c.id, withClimbUrl(c));
    }
    return processClimbDatabaseRecords(Array.from(byId.values()));
}
