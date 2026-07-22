import { COGGAN_ZONES } from '../cogganZones.js';

/**
 * Map intensity factor (NP ÷ FTP) to a Coggan power zone.
 * @param {number | null | undefined} ifRatio
 * @returns {typeof COGGAN_ZONES[number] | null}
 */
export function getCogganZoneForIntensityFactor(ifRatio) {
    const ratio = Number(ifRatio);
    if (!Number.isFinite(ratio) || ratio <= 0) return null;

    // Cumulative upper bounds — avoids gaps (e.g. 105–106% FTP) falling back to Z1.
    for (const zone of COGGAN_ZONES) {
        if (ratio <= zone.max) return zone;
    }
    return COGGAN_ZONES[COGGAN_ZONES.length - 1];
}
