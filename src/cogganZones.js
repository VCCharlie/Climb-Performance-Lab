/**
 * Coggan power zones — small constant, kept out of the lazy climb database chunk.
 */
/** Coggan zones as cumulative FTP ratios (no gaps between bands). */
export const COGGAN_ZONES = [
    { name: 'Z1 Recovery', min: 0, max: 0.55, color: '#9ca3af' },
    { name: 'Z2 Endurance', min: 0.55, max: 0.75, color: '#3b82f6' },
    { name: 'Z3 Tempo', min: 0.75, max: 0.90, color: '#22c55e' },
    { name: 'Z4 Threshold', min: 0.90, max: 1.05, color: '#eab308' },
    { name: 'Z5 VO2 Max', min: 1.05, max: 1.20, color: '#f97316' },
    { name: 'Z6 Anaerobic', min: 1.20, max: 1.50, color: '#ef4444' },
    { name: 'Z7 Neuro', min: 1.50, max: 10.0, color: '#a855f7' },
];
