#!/usr/bin/env node
/**
 * GPS Coordinate Validation for Climb-Performance-Lab
 * Validates coordinates against country-specific bounding boxes
 */

const fs = require('fs');
const path = require('path');

// Bounding boxes for each country
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

function parseClimbsFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const climbs = [];
    
    // Match individual climb objects within RAW_CLIMBS array
    const pattern = /"id":\s*"([^"]+)"\s*,\s*"name":\s*"([^"]+)"\s*,\s*"country":\s*"([^"]+)".*?"lat":\s*([-\d.]+)\s*,\s*"lon":\s*([-\d.]+)(?:.*?"url":\s*"([^"]*)")?(?:.*?"bigUrl":\s*"([^"]*)")?/gs;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
        try {
            const climb = {
                id: match[1],
                name: match[2],
                country: match[3],
                lat: parseFloat(match[4]),
                lon: parseFloat(match[5]),
                url: match[6] || '',
                bigUrl: match[7] || ''
            };
            climbs.push(climb);
        } catch (e) {
            // Skip entries that fail to parse
        }
    }
    
    return climbs;
}

function isCoordinateValid(lat, lon, bbox) {
    try {
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        return (bbox.latMin <= lat && lat <= bbox.latMax && 
                bbox.lonMin <= lon && lon <= bbox.lonMax);
    } catch (e) {
        return false;
    }
}

function validateClimbs(climbs) {
    const summary = {};
    const badEntries = {};
    let totalValid = 0;
    
    for (const climb of climbs) {
        const country = climb.country;
        
        // Skip ZWIFT entries
        if (country === 'ZWIFT') {
            continue;
        }
        
        // For unknown countries, just count them
        if (!(country in BBOXES)) {
            if (!(country in summary)) {
                summary[country] = { total: 0, bad: 0 };
            }
            summary[country].total++;
            continue;
        }
        
        if (!(country in summary)) {
            summary[country] = { total: 0, bad: 0 };
        }
        summary[country].total++;
        totalValid++;
        
        // Validate coordinates against country bounding box
        const bbox = BBOXES[country];
        if (!isCoordinateValid(climb.lat, climb.lon, bbox)) {
            summary[country].bad++;
            if (!(country in badEntries)) {
                badEntries[country] = [];
            }
            badEntries[country].push(climb);
        }
    }
    
    return { totalValid, summary, badEntries };
}

function formatOutput(totalValid, summary, badEntries) {
    let lines = [];
    
    lines.push(`Total entries: ${totalValid}\n`);
    lines.push('=== SUMMARY ===');
    
    // Sort countries and display summary
    const countries = Object.keys(summary).sort();
    for (const country of countries) {
        const stats = summary[country];
        lines.push(`${country}: ${stats.total} total, ${stats.bad} bad`);
    }
    
    lines.push('\n=== BAD ENTRIES ===');
    
    const badCountries = Object.keys(badEntries).sort();
    if (badCountries.length === 0) {
        lines.push('No bad entries found!');
    } else {
        for (const country of badCountries) {
            lines.push(`--- ${country} ---`);
            const sorted = badEntries[country].sort((a, b) => a.id.localeCompare(b.id));
            for (const entry of sorted) {
                const sourceUrl = entry.url || entry.bigUrl || 'no source';
                lines.push(`  ${entry.id} | ${entry.name} | lat=${entry.lat} | lon=${entry.lon} | ${sourceUrl}`);
            }
        }
    }
    
    return lines.join('\n');
}

function main() {
    const inputFile = path.join(__dirname, 'src', 'climbs_extended.js');
    const outputFile = path.join(__dirname, 'validation_output.txt');
    
    console.log(`Reading ${inputFile}...`);
    
    if (!fs.existsSync(inputFile)) {
        console.error(`ERROR: File not found: ${inputFile}`);
        process.exit(1);
    }
    
    // Parse the climbs file
    const climbs = parseClimbsFile(inputFile);
    console.log(`✓ Parsed ${climbs.length} climb entries`);
    
    // Validate climbs
    console.log('Validating GPS coordinates...');
    const { totalValid, summary, badEntries } = validateClimbs(climbs);
    console.log(`✓ Validation complete. Checked ${totalValid} entries with known countries`);
    
    // Generate formatted output
    const output = formatOutput(totalValid, summary, badEntries);
    
    // Save results to file
    fs.writeFileSync(outputFile, output, 'utf-8');
    console.log(`✓ Results saved to ${outputFile}\n`);
    
    // Display results
    console.log('='.repeat(80));
    console.log(output);
    console.log('='.repeat(80));
}

main();
