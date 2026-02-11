/**
 * src/utils/calculations.js
 * Mathematical models, Physics, and Power Analysis
 */

/**
 * --- POWER ZONES (COGGAN MODEL) ---
 */
export const calculatePowerZones = (ftp) => {
    if (!ftp || ftp <= 0) return [];
    return [
        { id: 'Z1', label: 'Active Recovery', min: 0, max: Math.round(ftp * 0.55), color: 'bg-gray-500' },
        { id: 'Z2', label: 'Endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: 'bg-blue-500' },
        { id: 'Z3', label: 'Tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), color: 'bg-green-500' },
        { id: 'Z4', label: 'Threshold', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: 'bg-yellow-500' },
        { id: 'Z5', label: 'VO2 Max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), color: 'bg-orange-500' },
        { id: 'Z6', label: 'Anaerobic', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50), color: 'bg-red-500' },
        { id: 'Z7', label: 'Neuromuscular', min: Math.round(ftp * 1.51), max: 9999, color: 'bg-purple-500' },
    ];
};

export const getPowerZone = (watts, ftp) => {
    if (!watts || !ftp) return null;
    const zones = calculatePowerZones(ftp);
    return zones.find(z => watts >= z.min && watts <= z.max) || zones[zones.length - 1];
};

/**
 * --- SCIENCE MODELS (ELITE) ---
 */
export const calculateBassettCorrection = (watts, altitude) => {
    // Bassett et al. (1999): ~1% power loss per 100m above 1000m roughly.
    // Normalized to Sea Level Equivalent.
    if (!watts || !altitude || altitude < 1000) return watts;
    const correctionFactor = 1 + ((altitude - 1000) / 100 * 0.01);
    return Math.round(watts * correctionFactor);
};

export const calculateFerrariWatts = (vam, gradient, totalWeight) => {
    // Ferrari Formula: Relative Power (W/kg) = VAM / (200 + 10 * Gradient(%))
    // Returns Total Watts if weight provided, else W/kg
    if (!vam || !gradient) return 0;
    const gradientFactor = 200 + (10 * gradient);
    const relativePower = vam / gradientFactor; // W/kg
    if (totalWeight) return Math.round(relativePower * totalWeight);
    return parseFloat(relativePower.toFixed(2));
};

/**
 * --- ANALYTICS ---
 */
export const calculateRollingTrend = (activities, targetDateStr, metricKey, windowDays = 15) => {
    const targetDate = new Date(targetDateStr);
    const msPerDay = 24 * 60 * 60 * 1000;
    const inWindow = activities.filter(a => {
        const d = new Date(a.date);
        const diffDays = Math.abs((targetDate - d) / msPerDay);
        const val = Number(a[metricKey]);
        return diffDays <= windowDays && !isNaN(val) && val > 0;
    });
    if (inWindow.length === 0) return 0;
    const sum = inWindow.reduce((acc, curr) => acc + (Number(curr[metricKey]) || 0), 0);
    return sum / inWindow.length;
};
