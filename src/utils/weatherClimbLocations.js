/**
 * Weather lookup hints for iconic climbs (shared by Weather tab and Bucket List).
 */
export const WEATHER_CLIMB_LOCATIONS = {
    fr_alpe: { q: 'Bourg-d\'Oisans,FR', label: 'Le Bourg-d\'Oisans, Auvergne-Rhône-Alpes, France' },
    fr_ventoux: { q: 'Bedoin,FR', label: 'Bédoin, France' },
    fr_ventoux_mal: { q: 'Malaucene,FR', label: 'Malaucène, France' },
    fr_tourmalet: { q: 'Luz-Saint-Sauveur,FR', label: 'Luz-Saint-Sauveur, France' },
    fr_galibier: { q: 'Valloire,FR', label: 'Valloire, France' },
    fr_aubisque: { q: 'Laruns,FR', label: 'Laruns, France' },
    fr_izoard: { q: 'Guillestre,FR', label: 'Guillestre, France' },
    fr_croix_de_fer: { q: 'Saint-Jean-de-Maurienne,FR', label: 'Saint-Jean-de-Maurienne, France' },
    it_stelvio: { q: 'Prato allo Stelvio,IT', label: 'Prato allo Stelvio, Italy' },
    it_zoncolan: { q: 'Ovaro,IT', label: 'Ovaro, Italy' },
    it_gavia: { q: 'Bormio,IT', label: 'Bormio, Italy' },
    it_mortirolo: { q: 'Mazzo di Valtellina,IT', label: 'Mazzo di Valtellina, Italy' },
    ch_grimsel: { q: 'Meiringen,CH', label: 'Meiringen, Switzerland' },
    ch_furka: { q: 'Realp,CH', label: 'Realp, Switzerland' },
    ch_gotthard: { q: 'Airolo,CH', label: 'Airolo, Switzerland' },
};

/**
 * @param {object} climb
 * @returns {string | null}
 */
export function weatherLookupQueryForClimb(climb) {
    if (!climb) return null;
    const known = WEATHER_CLIMB_LOCATIONS[climb.id];
    if (known?.q) return known.q;
    if (climb.country === 'ZWIFT') return null;
    if (climb.lat != null && climb.lon != null) {
        return `${climb.lat},${climb.lon}`;
    }
    const region = climb.region ? `, ${climb.region}` : '';
    return `${climb.name}${region}, ${climb.country}`;
}
