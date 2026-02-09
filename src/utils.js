/**
 * src/utils.js
 */

// --- POWER ZONES (COGGAN MODEL) ---
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

// --- DATUM FORMATTERS ---
export const normalizeDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes('/') || dateStr.includes('-')) {
        const sep = dateStr.includes('/') ? '/' : '-';
        const parts = dateStr.split(sep);
        if (parts.length === 3) {
            if (parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return dateStr;
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return dateStr;
};

export const formatDateDDMMYYYY = (isoString) => {
    if (!isoString) return '-';
    try {
        const d = new Date(isoString);
        // Forceer nl-NL: "09-02-2026"
        return d.toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return isoString;
    }
};

export const formatTime = (seconds) => {
    const sNum = Number(seconds);
    if (!sNum || isNaN(sNum)) return "00:00";
    const h = Math.floor(sNum / 3600);
    const m = Math.floor((sNum % 3600) / 60);
    const s = Math.floor(sNum % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const parseDurationToSeconds = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
    }
    if (str.includes('h') || str.includes('m') || str.includes('s')) {
        let total = 0;
        const h = str.match(/(\d+)h/);
        const m = str.match(/(\d+)m/);
        const s = str.match(/(\d+)s/);
        if (h) total += parseInt(h[1]) * 3600;
        if (m) total += parseInt(m[1]) * 60;
        if (s) total += parseInt(s[1]);
        return total > 0 ? total : 0;
    }
    const rawNum = parseFloat(str.replace(',', '.'));
    return !isNaN(rawNum) ? rawNum : 0;
};

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

// --- SCIENCE MODELS (ELITE) ---
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

const cleanNumber = (val) => {
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
        if (cleanH === 'work' || cleanH === 'total work' || cleanH.includes('joules')) return 'work'; // Added Work
        if (cleanH === 'rpe' || cleanH.includes('perceived exertion') || cleanH.includes('feel')) return 'rpe';
        if (cleanH === 'ftp' || cleanH.includes('icu ftp') || cleanH.includes('icu_pm_ftp')) return 'ftp';

        // Best Power / Peak Power
        if (cleanH.includes('best 1min') || cleanH.includes('best 1m') || cleanH === 'w1min') return 'best_1min';
        if (cleanH.includes('best 5min') || cleanH.includes('best 5m') || cleanH === 'w5min') return 'best_5min';
        if (cleanH.includes('best 10min') || cleanH.includes('best 10m') || cleanH === 'w10min') return 'best_10min';
        if (cleanH.includes('best 20min') || cleanH.includes('best 20m') || cleanH === 'w20min') return 'best_20min';
        if (cleanH.includes('best 60min') || cleanH.includes('best 60m') || cleanH === 'w60min') return 'best_60min';

        if (cleanH === 'average heartrate' || cleanH === 'avg hr' || cleanH === 'hr' || cleanH.includes('heart rate') || cleanH.includes('heartrate')) return 'avg_hr';
        if (cleanH === 'avg altitude' || cleanH === 'average altitude' || cleanH === 'altitude avg') return 'avg_altitude';
        if (cleanH === 'max altitude' || cleanH === 'maximum altitude') return 'max_altitude';
        if (cleanH === 'max power' || cleanH === 'max watts' || cleanH === 'maximum power') return 'max_power';
        if (cleanH === 'max heartrate' || cleanH === 'max hr' || cleanH === 'maximum heart rate') return 'max_hr';
    };
    const colMap = rawHeaders.map(mapHeader);
    return rows.slice(1).map(row => {
        const entry = {};
        colMap.forEach((key, idx) => {
            if (!key) return;
            let val = row[idx] !== undefined ? row[idx].trim().replace(/^"|"$/g, '') : '';
            if (key === 'date') entry[key] = normalizeDate(val);
            else if (key === 'moving_time') entry[key] = parseDurationToSeconds(val);
            else if (key === 'title' || key === 'type') entry[key] = val;
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

// Shared Normalizer for API & JSON Import
export const normalizeIntervalsActivity = (item) => {
    const getNum = (val) => { const n = Number(val); return isNaN(n) ? 0 : n; };
    const getVal = (...keys) => { for (const k of keys) { if (item[k] !== undefined && item[k] !== null && item[k] !== "") return item[k]; } return null; };

    const id = String(getVal('id', 'activity_id') || Math.random().toString(36).substr(2, 9));
    const dateStr = getVal('startDate', 'start_date_local', 'start_date', 'date');
    const title = getVal('name', 'title') || "Untitled";

    const movingTime = getNum(getVal('movingTime', 'moving_time', 'icu_recording_time', 'elapsedTime', 'elapsed_time', 'time'));
    const distanceMeters = getNum(getVal('distance', 'icu_distance', 'total_distance'));
    const climbing = getNum(getVal('elevationGain', 'total_elevation_gain', 'total_elevation_loss', 'climbing'));
    const avgSpeedMs = getNum(getVal('avg_speed', 'avgSpeed', 'average_speed', 'velocity_smooth'));
    const normPower = getNum(getVal('norm_power', 'normalizedPower', 'icu_weighted_avg_watts', 'weighted_average_watts', 'np', 'normalized_power'));
    const avgPower = getNum(getVal('avgWatts', 'icu_average_watts', 'average_watts', 'device_watts', 'avg_power', 'power'));
    const avgHr = getNum(getVal('average_heartrate', 'avg_hr', 'average_hr', 'hr', 'icu_average_heartrate', 'avg_heartrate'));
    const load = getNum(getVal('load', 'trainingLoad', 'icu_training_load', 'training_load', 'power_load', 'hr_load', 'pace_load', 'tss'));
    const work = getNum(getVal('work', 'total_work', 'icu_joules', 'joules', 'kilojoules', 'energy'));
    const rpe = getNum(getVal('rpe', 'icu_rpe', 'perceived_exertion', 'feel', 'session_rpe'));
    const ftp = getNum(getVal('ftp', 'icu_ftp', 'icu_pm_ftp', 'cp'));
    const maxPower = getNum(getVal('max_power', 'maxWatts', 'icu_max_watts', 'max_watts'));
    const maxHr = getNum(getVal('max_hr', 'max_heartrate', 'max_heart_rate', 'icu_max_hr'));

    const best1min = getNum(getVal('best_1min', 'Best1minpower', 'best_1min_power', 'w1min'));
    const best5min = getNum(getVal('best_5min', 'Best5minpower', 'best_5min_power', 'w5min'));
    const best10min = getNum(getVal('best_10min', 'Best10minpower', 'best_10min_power', 'w10min'));
    const best20min = getNum(getVal('best_20min', 'Best20minpower', 'best_20min_power', 'w20min'));
    const best60min = getNum(getVal('best_60min', 'Best60minpower', 'best_60min_power', 'w60min'));

    const avgAltitude = getNum(getVal('avgAltitude', 'average_altitude', 'avg_altitude'));
    const maxAltitude = getNum(getVal('maxAltitude', 'maximum_altitude', 'max_altitude'));

    const rawType = getVal('type', 'sub_type', 'activity_type');
    const finalType = determineActivityType(rawType, title);

    return {
        id: id,
        date: normalizeDate(dateStr),
        title: title,
        type: finalType,
        moving_time: movingTime,
        distance: distanceMeters > 1000 ? (distanceMeters / 1000).toFixed(2) : distanceMeters,
        climbing: Math.round(climbing),
        avg_speed: (avgSpeedMs > 0 && avgSpeedMs < 15) ? (avgSpeedMs * 3.6).toFixed(1) : avgSpeedMs,
        norm_power: Math.round(normPower),
        avg_power: Math.round(avgPower),
        avg_hr: Math.round(avgHr),
        load: Math.round(load),
        work: Math.round(work),
        rpe: rpe,
        ftp: Math.round(ftp),
        max_power: Math.round(maxPower),
        max_hr: Math.round(maxHr),
        best_1min: Math.round(best1min),
        best_5min: Math.round(best5min),
        best_10min: Math.round(best10min),
        best_20min: Math.round(best20min),
        best_60min: Math.round(best60min),
        avg_altitude: Math.round(avgAltitude),
        max_altitude: Math.round(maxAltitude)
    };
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
