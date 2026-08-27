/**
 * src/utils/parsers.js
 * Parsing logic for JSON imports and data cleaning.
 */

import { normalizeIntervalsActivityFromAny } from './intervals';
// determineActivityType is defined in activityTypes.js to break the circular
// dependency (intervals.js → parsers.js → intervals.js). Imported for local
// use and re-exported so existing imports from parsers.js keep working.
import { determineActivityType } from './activityTypes';
export { determineActivityType };

// --- DATA CLEANING ---

export const cleanNumber = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let strVal = val.toString().trim();
    if (strVal === '') return 0;

    // PROTECTION: Intervals sometimes exports arrays as 'min:max' (e.g. 635:646).
    // If we strip non-digits, this becomes 635646.
    // We should treat this as invalid for a single scalar number, or take the first part.
    // For safety in this general parser, we return 0 or the first part.
    if (strVal.includes(':')) {
        // Only allow if it looks like a simple float/int
        return 0;
    }

    // Remove common units like 'kg', 'm', 'W' etc. if attached
    strVal = strVal.replace(/[^\d.,-]/g, '');

    // Handle EU (1.234,56) vs US (1,234.56)
    // Heuristic: If both . and , exist, the one appearing LAST is the decimal separator.
    if (strVal.includes('.') && strVal.includes(',')) {
        const lastDot = strVal.lastIndexOf('.');
        const lastComma = strVal.lastIndexOf(',');

        if (lastComma > lastDot) {
            // EU Format: 1.234,56 -> Remove . then swap , to .
            strVal = strVal.replace(/\./g, '').replace(',', '.');
        } else {
            // US Format: 1,234.56 -> Remove ,
            strVal = strVal.replace(/,/g, '');
        }
    } else if (strVal.includes(',')) {
        // Only comma? Assume it is decimal if it looks like a decimal (e.g. 12,5)
        // But if it looks like 1,000 it might be a thousand separator...
        // Safest assumption for this app (European context dominant): Comma is usually decimal.
        strVal = strVal.replace(',', '.');
    }

    // Safety check for multiple decimals
    const parts = strVal.split('.');
    if (parts.length > 2) {
        // e.g. 1.2.3 -> Invalid, take first part
        return 0;
    }

    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
};

export const smartParseJSON = (jsonText) => {
    try {
        const rawData = JSON.parse(jsonText);
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        if (dataArray.length === 0) return [];
        return dataArray.map(normalizeIntervalsActivityFromAny);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return [];
    }
};
