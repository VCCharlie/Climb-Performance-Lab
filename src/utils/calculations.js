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

/**
 * --- GEO UTILITIES ---
 */

/**
 * Haversine formula: great-circle distance between two GPS points.
 * @returns {number} Distance in kilometers
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * --- CLIMB CATEGORIZATION ---
 */
export const calculateClimbCategory = (lengthKm, avgGrade) => {
    // Simple Score = Length (km) * Grade (%)
    // This is a simplified version of standard categorization.

    if (!lengthKm || !avgGrade) return { label: '-', className: 'text-cdmuted', score: 0 };

    let score = lengthKm * avgGrade;
    // Bump score for >10% briefly
    if (avgGrade > 10) score *= 1.25;

    if (score > 100 || (lengthKm > 15 && avgGrade > 6)) return { label: 'HC', className: 'text-slate-900 bg-white border border-slate-300 shadow-sm font-black', score, full: 'Hors Catégorie' };
    if (score > 60) return { label: '1', className: 'text-cdtext bg-red-600 shadow-sm font-bold', score, full: 'Cat 1' };
    if (score > 35) return { label: '2', className: 'text-cdtext bg-orange-500 shadow-sm font-bold', score, full: 'Cat 2' };
    if (score > 16) return { label: '3', className: 'text-cdtext bg-yellow-500 shadow-sm font-bold', score, full: 'Cat 3' };
    return { label: '4', className: 'text-cdtext bg-green-500 shadow-sm font-bold', score, full: 'Cat 4' };
};

/**
 * Compact metrics for the Climbs / physics UI (power vs FTP, energy density, gradient context).
 */
export const summarizeClimbPhysics = ({
    lengthKm,
    elevation,
    avgGrade,
    ftp,
    watts,
    seconds,
    riderWeightKg
}) => {
    const dist = Number(lengthKm) || 0;
    const elev = Number(elevation) || 0;
    const grade = Number(avgGrade) || 0;
    const w = Number(watts) || 0;
    const t = Number(seconds) || 0;
    const f = Number(ftp) || 0;
    const rw = Number(riderWeightKg) || 0;

    const pctFtp = f > 0 && w > 0 ? (w / f) * 100 : null;
    const kJ = t > 0 && w > 0 ? Math.round((w * t) / 1000) : null;
    const kJperKm = kJ != null && dist > 0 ? Math.round(kJ / dist) : null;
    const elevPerKm = dist > 0 ? Math.round(elev / dist) : null;
    const wkg = rw > 0 && w > 0 ? w / rw : null;
    const category = dist > 0 && grade > 0 ? calculateClimbCategory(dist, grade) : null;

    let gradientNote = null;
    if (grade >= 10) gradientNote = 'Very steep — short power spikes and traction matter as much as FTP.';
    else if (grade >= 7) gradientNote = 'Steep — pacing and sustainable torque are key.';
    else if (grade >= 4) gradientNote = 'Moderate gradient — rhythm and aero still play a role.';

    return {
        pctFtp,
        kJ,
        kJperKm,
        elevPerKm,
        wkg,
        category,
        gradientNote
    };
};
