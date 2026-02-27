/**
 * src/utils/activityTypes.js
 * Extracted from parsers.js to break the circular dependency:
 *   intervals.js → parsers.js → intervals.js
 * Both intervals.js and parsers.js import from this file.
 */

export const determineActivityType = (type, title) => {
    let cleanType = type ? type.toString().replace(/\s+/g, '') : 'Ride';
    if (cleanType.toLowerCase() === 'virtualride') return 'VirtualRide';
    if (cleanType.toLowerCase() === 'run') return 'Run';
    if (cleanType.toLowerCase() === 'walk') return 'Walk';
    if (cleanType.toLowerCase() === 'hike') return 'Hike';
    if (['nordicski', 'alpineski', 'iceskate'].includes(cleanType.toLowerCase())) return 'Run';
    const name = title ? title.toLowerCase() : '';
    const virtualKeywords = ['virtual', 'indoor', 'zwift', 'watopia', 'rouvy', 'fulgaz', 'bkool', 'indievelo', 'tacx', 'trainerroad', 'wahoo'];
    if (virtualKeywords.some(keyword => name.includes(keyword))) return 'VirtualRide';
    return 'Ride';
};
