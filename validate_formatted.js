// Properly formatted validation output
const fs = require('fs');
const path = require('path');

// Define bounding boxes
const BBOXES = {
    "NL": {"latMin": 50.75, "latMax": 53.60, "lonMin": 3.30, "lonMax": 7.30},
    "BE": {"latMin": 49.50, "latMax": 51.55, "lonMin": 2.50, "lonMax": 6.55},
    "LU": {"latMin": 49.40, "latMax": 50.20, "lonMin": 5.70, "lonMax": 6.55},
    "FR": {"latMin": 41.30, "latMax": 51.10, "lonMin": -5.20, "lonMax": 9.70},
    "DE": {"latMin": 47.27, "latMax": 55.10, "lonMin": 5.87, "lonMax": 15.05},
    "AT": {"latMin": 46.37, "latMax": 49.02, "lonMin": 9.53, "lonMax": 17.20},
    "IT": {"latMin": 35.49, "latMax": 47.10, "lonMin": 6.62, "lonMax": 18.55},
    "CH": {"latMin": 45.82, "latMax": 47.81, "lonMin": 5.95, "lonMax": 10.55},
    "ES": {"latMin": 35.17, "latMax": 43.82, "lonMin": -9.40, "lonMax": 4.60},
    "PT": {"latMin": 36.83, "latMax": 42.20, "lonMin": -9.52, "lonMax": -6.19},
    "GB": {"latMin": 49.87, "latMax": 60.90, "lonMin": -8.65, "lonMax": 1.77},
};

function isCoordinateValid(lat, lon, bbox) {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
        return false;
    }
    return (bbox.latMin <= lat && lat <= bbox.latMax && 
            bbox.lonMin <= lon && lon <= bbox.lonMax);
}

function getSourceUrl(entry) {
    if (entry.url) {
        return entry.url;
    } else if (entry.bigUrl) {
        return entry.bigUrl;
    } else {
        return "no source";
    }
}

// Read the file
const filepath = path.join(__dirname, 'src', 'climbs_extended.js');
const content = fs.readFileSync(filepath, 'utf-8');

// Extract RAW_CLIMBS array
let climbs;
try {
    // Find the RAW_CLIMBS array
    const match = content.match(/const\s+RAW_CLIMBS\s*=\s*(\[[\s\S]*?\]);\s*export/);
    if (match) {
        const jsonStr = match[1];
        climbs = JSON.parse(jsonStr);
    } else {
        throw new Error("Could not find RAW_CLIMBS array");
    }
} catch (error) {
    console.error('Error parsing JSON:', error.message);
    process.exit(1);
}

// Validate entries
const stats = {};
const badEntries = {};

for (const entry of climbs) {
    const country = (entry.country || "").toUpperCase();
    
    // Skip ZWIFT
    if (country === "ZWIFT") {
        continue;
    }
    
    // Skip if country not in BBOXES
    if (!(country in BBOXES)) {
        continue;
    }
    
    if (!(country in stats)) {
        stats[country] = { total: 0, bad: 0 };
    }
    stats[country].total++;
    
    const lat = entry.lat;
    const lon = entry.lon;
    
    // Check if coordinates are valid
    if (!isCoordinateValid(lat, lon, BBOXES[country])) {
        stats[country].bad++;
        if (!(country in badEntries)) {
            badEntries[country] = [];
        }
        badEntries[country].push(entry);
    }
}

// Print output in the exact requested format
let output = [];

const total = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
output.push(`Total entries: ${total}`);
output.push('');
output.push('=== SUMMARY ===');

for (const country of Object.keys(stats).sort()) {
    const total_c = stats[country].total;
    const bad_c = stats[country].bad;
    output.push(`${country}: ${total_c} total, ${bad_c} bad`);
}

if (Object.keys(badEntries).length > 0) {
    output.push('');
    output.push('=== BAD ENTRIES ===');
    for (const country of Object.keys(badEntries).sort()) {
        output.push(`--- ${country} ---`);
        for (const entry of badEntries[country]) {
            const entry_id = entry.id || "N/A";
            const name = entry.name || "N/A";
            const lat = entry.lat !== undefined ? entry.lat : "N/A";
            const lon = entry.lon !== undefined ? entry.lon : "N/A";
            const source = getSourceUrl(entry);
            output.push(`  ${entry_id} | ${name} | lat=${lat} | lon=${lon} | ${source}`);
        }
    }
}

// Write to file
fs.writeFileSync('validation_output_formatted.txt', output.join('\n'), 'utf-8');

// Also print to console
output.forEach(line => console.log(line));
