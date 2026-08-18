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

/** ISO-ish country codes → English names for OpenWeather geocode queries. */
export const WEATHER_COUNTRY_LABELS = {
    FR: 'France',
    IT: 'Italy',
    CH: 'Switzerland',
    NL: 'Netherlands',
    ES: 'Spain',
    DE: 'Germany',
    BE: 'Belgium',
    AT: 'Austria',
    GB: 'United Kingdom',
    UK: 'United Kingdom',
    US: 'United States',
};

/**
 * @param {string} [code]
 */
export function weatherCountryLabel(code) {
    if (!code) return '';
    const key = String(code).trim().toUpperCase();
    return WEATHER_COUNTRY_LABELS[key] || key;
}

/**
 * Whether weather lookup is meaningful for this climb (outdoor coords, hint, or named region).
 * @param {object} climb
 */
export function canResolveWeatherForClimb(climb) {
    if (!climb) return false;
    if (climb.country === 'ZWIFT') return false;
    if (WEATHER_CLIMB_LOCATIONS[climb.id]?.q) return true;
    if (climb.lat != null && climb.lon != null) return true;
    if (climb.name && climb.country) return true;
    return false;
}

/**
 * @param {object} climb
 * @returns {string | null}
 */
export function weatherLookupQueryForClimb(climb) {
    if (!climb) return null;
    const known = WEATHER_CLIMB_LOCATIONS[climb.id];
    if (known?.q) return known.q;
    if (climb.country === 'ZWIFT') return null;

    const lat = Number(climb.lat);
    const lon = Number(climb.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return `${lat},${lon}`;
    }

    const countryLabel = weatherCountryLabel(climb.country);
    const region = climb.region ? String(climb.region).trim() : '';
    const name = String(climb.name || '').trim();
    if (!name || !countryLabel) return null;

    if (region) {
        return `${name}, ${region}, ${countryLabel}`;
    }
    return `${name}, ${countryLabel}`;
}
