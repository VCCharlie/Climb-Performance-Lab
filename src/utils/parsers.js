/**
 * src/utils/parsers.js
 * Parsing logic for CSV, JSON and Data Cleaning
 */

import { normalizeDate, parseDurationToSeconds } from './formatters';
import { normalizeIntervalsActivity } from './intervals';
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
    // We should treat this as invalid for a single scalar number, or take the average.
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

// --- CSV PARSING ---

const detectDelimiter = (lines) => {
    if (!lines || lines.length === 0) return ',';
    const sample = lines.slice(0, 5).join('\n');
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    const tabs = (sample.match(/\t/g) || []).length;

    // Bias towards semicolon for EU CSVs
    if (semis >= commas && semis > tabs) return ';';
    if (tabs > commas && tabs > semis) return '\t';
    return ',';
};

const parseCSVToRows = (text, delimiter) => {
    try {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;
        // Clean BOM and standardize line endings
        const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const nextChar = cleanText[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' && !inQuotes) {
                currentRow.push(currentCell.trim());
                if (currentRow.some(cell => cell !== '')) { // Skip empty rows
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        // Push last row if exists
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
        }
        return rows;
    } catch (e) {
        console.error("CSV Row Parse Error:", e);
        return [];
    }
};

export const smartParseCSV = (text) => {
    if (!text || !text.trim()) {
        console.warn("[SmartParseCSV] Empty text provided");
        return [];
    }

    // Handle 'sep=' header often found in Excel exports
    let lines = text.trim().split(/\r?\n/);
    if (lines.length > 0 && lines[0].toLowerCase().startsWith('sep=')) {
        lines.shift();
        text = lines.join('\n');
    }

    const delimiter = detectDelimiter(lines);
    console.log(`[SmartParseCSV] Detected delimiter: '${delimiter}'`);

    const rows = parseCSVToRows(text, delimiter);
    if (rows.length < 2) {
        console.error("[SmartParseCSV] Not enough rows (need header + data)", rows);
        return [];
    }
    const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

    // Header Mapping Logic
    const mapHeader = (h) => {
        // Normalize: lowercase, remove quotes, trim
        const cleanH = h.toLowerCase().trim().replace(/^"|"$/g, '').replace(/_/g, ' ');

        // ID & Metadata
        if (cleanH === 'activity id' || cleanH === 'id' || cleanH.includes('activity id')) return 'id';
        if (cleanH === 'name' || cleanH === 'title' || cleanH.includes('activity name')) return 'title';
        if (cleanH === 'type' || cleanH === 'sub_type' || cleanH.includes('activity type')) return 'type';
        if (cleanH === 'date' || cleanH.includes('start date') || cleanH.includes('datum')) return 'date';

        // Basic Metrics
        if (cleanH === 'time' || cleanH === 'moving time' || cleanH === 'elapsed time' || cleanH.includes('moving_time')) return 'moving_time';
        if (cleanH === 'distance' || cleanH === 'dist' || cleanH.includes('afstand')) return 'distance';
        if (cleanH === 'elevation' || cleanH === 'elev' || cleanH.includes('elevation gain') || cleanH.includes('climb') || cleanH.includes('hoogte')) return 'climbing';
        if (cleanH === 'average speed' || cleanH === 'avg speed' || cleanH === 'spd' || cleanH.includes('snelheid') || cleanH.includes('speed')) return 'avg_speed';

        // Power & Load
        if (cleanH === 'normalized power' || cleanH === 'norm power' || cleanH === 'np' || cleanH.includes('weighted avg power')) return 'norm_power';
        if (cleanH === 'average power' || cleanH === 'avg power' || cleanH === 'power' || cleanH === 'watts' || cleanH === 'avg' || cleanH.includes('average watts')) return 'avg_power';
        if (cleanH === 'training load' || cleanH === 'load' || cleanH === 'tss' || cleanH.includes('icu training load')) return 'load';
        if (cleanH === 'work' || cleanH === 'total work' || cleanH === 'kilojoules') return 'work';
        if (cleanH.includes('joules') || cleanH === 'energy') return 'joules'; // Map to temp key for conversion
        if (cleanH === 'rpe' || cleanH.includes('perceived exertion') || cleanH.includes('feel')) return 'rpe';
        if (cleanH === 'ftp' || cleanH.includes('icu ftp') || cleanH.includes('icu_pm_ftp')) return 'ftp';

        // Best Power / Peak Power
        if (cleanH.includes('best 1min') || cleanH.includes('best 1m') || cleanH === 'w1min') return 'best_1min';
        if (cleanH.includes('best 5min') || cleanH.includes('best 5m') || cleanH === 'w5min') return 'best_5min';
        if (cleanH.includes('best 10min') || cleanH.includes('best 10m') || cleanH === 'w10min') return 'best_10min';
        if (cleanH.includes('best 20min') || cleanH.includes('best 20m') || cleanH === 'w20min') return 'best_20min';
        if (cleanH.includes('best 60min') || cleanH.includes('best 60m') || cleanH === 'w60min') return 'best_60min';

        if (cleanH === 'average heartrate' || cleanH === 'avg hr' || cleanH === 'hr' || cleanH.includes('heart rate') || cleanH.includes('heartrate')) return 'avg_hr';
        if (cleanH === 'avg altitude' || cleanH === 'average altitude' || cleanH === 'avg_altitude') return 'avg_altitude';
        if (cleanH === 'max altitude' || cleanH === 'maximum altitude') return 'max_altitude';
        if (cleanH === 'max power' || cleanH === 'max watts' || cleanH === 'maximum power' || cleanH === 'p_max' || cleanH.includes('icu pm p max') || cleanH === 'max_watts') return 'max_power';
        if (cleanH === 'max heartrate' || cleanH === 'max hr' || cleanH === 'maximum heart rate') return 'max_hr';
    };
    const colMap = rawHeaders.map(mapHeader);
    return rows.slice(1).map(row => {
        const entry = {};
        colMap.forEach((key, idx) => {
            if (!key) return;
            let val = row[idx] !== undefined ? row[idx].trim().replace(/^"|"$/g, '') : '';
            if (key === 'date') entry[key] = normalizeDate(val);
            else if (key === 'moving_time') {
                entry[key] = parseDurationToSeconds(val);
            }
            else if (key === 'title' || key === 'type') entry[key] = val;
            else if (key === 'joules') {
                // Convert Joules to kJ
                const j = cleanNumber(val);
                if (j > 0) entry['work'] = Math.round(j / 1000);
            }
            else entry[key] = cleanNumber(val);
        });



        if (!entry.title) entry.title = "Untitled";
        if (!entry.id) entry.id = 'csv_' + Math.random().toString(36).substr(2, 9);
        if (!entry.date || entry.date === 'Invalid Date') entry.date = new Date().toISOString().split('T')[0];
        entry.type = determineActivityType(entry.type, entry.title);
        if (entry.distance > 2000) entry.distance = (entry.distance / 1000).toFixed(2);
        if (entry.avg_speed > 0 && entry.avg_speed < 15) entry.avg_speed = (entry.avg_speed * 3.6).toFixed(1);
        return entry;
    }).filter(e => e.distance > 0 || e.moving_time > 0);
};

export const smartParseJSON = (jsonText) => {
    try {
        const rawData = JSON.parse(jsonText);
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        if (dataArray.length === 0) return [];
        return dataArray.map(normalizeIntervalsActivity);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return [];
    }
};
