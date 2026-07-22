import { COGGAN_ZONES } from '../cogganZones.js';

/**
 * Map intensity factor (NP ÷ FTP) to a Coggan power zone.
 * @param {number | null | undefined} ifRatio
 * @returns {typeof COGGAN_ZONES[number] | null}
 */
export function getCogganZoneForIntensityFactor(ifRatio) {
    const ratio = Number(ifRatio);
    if (!Number.isFinite(ratio) || ratio <= 0) return null;

    const zone = COGGAN_ZONES.find((z) => ratio >= z.min && ratio <= z.max);
    if (zone) return zone;

    const top = COGGAN_ZONES[COGGAN_ZONES.length - 1];
    if (ratio > top.max) return top;
    return COGGAN_ZONES[0];
}
