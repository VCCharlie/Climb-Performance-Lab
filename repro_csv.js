const smartParseCSV = (text) => {
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

    const delimiter = detectDelimiter(lines);
    console.log(`[SmartParseCSV] Detected delimiter: '${delimiter}'`);

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

    const rows = parseCSVToRows(text, delimiter);
    if (rows.length < 2) {
        console.error("[SmartParseCSV] Not enough rows (need header + data)", rows);
        return [];
    }
    const rawHeaders = rows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

    // --- THIS IS THE LOGIC TO TEST ---
    const mapHeader = (h) => {
        const cleanH = h.replace(/_/g, ' ');
        if (h === 'activity id' || h === 'id' || cleanH.includes('activity id')) return 'id';
        if (h === 'name' || h === 'title' || cleanH.includes('activity name')) return 'title';
        if (h === 'type' || h === 'sub_type' || cleanH.includes('activity type')) return 'type';
        if (h === 'start_date_local' || cleanH.includes('date') || cleanH.includes('datum')) return 'date';
        if (h === 'moving_time' || cleanH.includes('moving time') || cleanH.includes('elapsed time')) return 'moving_time';
        if (h === 'distance' || cleanH.includes('afstand')) return 'distance';
        if (h === 'total_elevation_gain' || cleanH.includes('climb') || cleanH.includes('elevation') || cleanH.includes('hoogte')) return 'climbing';
        if (h === 'average_speed' || cleanH.includes('speed') || cleanH.includes('snelheid')) return 'avg_speed';
        if (h === 'icu_weighted_avg_watts' || cleanH.includes('weighted avg power') || cleanH.includes('norm power') || cleanH.includes('np')) return 'norm_power';
        if (h === 'icu_average_watts' || h === 'average_watts' || cleanH.includes('avg power') || cleanH.includes('average watts') || h === 'power' || h === 'watts') return 'avg_power';
        if (h === 'icu_training_load' || h === 'training_load' || cleanH.includes('tss') || cleanH.includes('load')) return 'load';
        if (h === 'icu_rpe' || h === 'rpe' || cleanH.includes('feel')) return 'rpe';
        if (h === 'icu_ftp' || h === 'ftp' || cleanH.includes('ftp')) return 'ftp';
        if (cleanH.includes('best1min') || cleanH.includes('best 1min') || cleanH === 'w1min') return 'best_1min';
        if (cleanH.includes('best5min') || cleanH.includes('best 5min') || cleanH === 'w5min') return 'best_5min';
        if (cleanH.includes('best10min') || cleanH.includes('best 10min') || cleanH === 'w10min') return 'best_10min';
        if (cleanH.includes('best20min') || cleanH.includes('best 20min') || cleanH === 'w20min') return 'best_20min';
        if (cleanH.includes('best60min') || cleanH.includes('best 60min') || cleanH === 'w60min') return 'best_60min';
        return null;
    };
    // --------------------------------

    const colMap = rawHeaders.map(mapHeader);

    // Log mapping for debugging
    console.log("Header Mapping:");
    rawHeaders.forEach((h, i) => {
        console.log(`  '${h}' -> '${colMap[i]}'`);
    });

    return rows.slice(1).map(row => {
        const entry = {};
        colMap.forEach((key, idx) => {
            if (!key) return;
            let val = row[idx] !== undefined ? row[idx].trim().replace(/^"|"$/g, '') : '';
            entry[key] = val;
        });
        return entry;
    });
};

// TEST CASE
const csvContent = `Date,Name,Details,Activity Type,Elapsed Time,Distance,Weighted Avg Power,Avg Power,Total Work,Training Load
2023-10-25,Morning Ride,,Ride,3600,25000,200,180,500,60
`;

console.log("Testing with sample CSV:");
const result = smartParseCSV(csvContent);
console.log("Parsed Result:", result);
