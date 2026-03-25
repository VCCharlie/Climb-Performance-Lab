#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define bounding boxes
const BBOXES = {
    "NL": {"lat": [50.75, 53.60], "lon": [3.30, 7.30]},
    "BE": {"lat": [49.50, 51.55], "lon": [2.50, 6.55]},
    "LU": {"lat": [49.40, 50.20], "lon": [5.70, 6.55]},
    "FR": {"lat": [41.30, 51.10], "lon": [-5.20, 9.70]},
    "DE": {"lat": [47.27, 55.10], "lon": [5.87, 15.05]},
    "AT": {"lat": [46.37, 49.02], "lon": [9.53, 17.20]},
    "IT": {"lat": [35.49, 47.10], "lon": [6.62, 18.55]},
    "CH": {"lat": [45.82, 47.81], "lon": [5.95, 10.55]},
    "ES": {"lat": [35.17, 43.82], "lon": [-9.40, 4.60]},
    "PT": {"lat": [36.83, 42.20], "lon": [-9.52, -6.19]},
    "GB": {"lat": [49.87, 60.90], "lon": [-8.65, 1.77]},
};

try {
    const filePath = path.join(__dirname, 'src', 'climbs_extended.js');
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove the const declaration and semicolon
    content = content.replace(/^const\s+RAW_CLIMBS\s*=\s*/m, '').replace(/;?\s*export const CLIMB_DATABASE[\s\S]*$/, '').trim();
    
    // If it still has wrapping, remove it
    if (!content.startsWith('[')) {
        const match = content.match(/(\[[\s\S]*\])/);
        if (match) {
            content = match[1];
        }
    }

    const data = JSON.parse(content);

    console.log(`Total entries loaded: ${data.length}`);
    console.log();

    // Validate coordinates
    const stats = {};

    for (const entry of data) {
        const country = entry.country || '';
        
        if (country === 'ZWIFT') continue;
        if (!(country in BBOXES)) continue;
        
        const lat = entry.lat;
        const lon = entry.lon;
        
        if (lat === undefined || lat === null || lon === undefined || lon === null) continue;
        
        const bbox = BBOXES[country];
        const [latMin, latMax] = bbox.lat;
        const [lonMin, lonMax] = bbox.lon;
        
        if (!(country in stats)) {
            stats[country] = {total: 0, bad: 0, bad_entries: []};
        }
        
        stats[country].total++;
        
        if (!(latMin <= lat && lat <= latMax && lonMin <= lon && lon <= lonMax)) {
            stats[country].bad++;
            stats[country].bad_entries.push({
                id: entry.id || 'N/A',
                name: entry.name || 'N/A',
                country,
                lat,
                lon,
                source_verified: entry.source_verified || entry.source || 'N/A'
            });
        }
    }

    console.log('=== PER-COUNTRY SUMMARY ===');
    const header = `${'Country':<8} ${'Total':>6} ${'OK':>6} ${'BAD':>6}`;
    console.log(header);
    console.log('-'.repeat(30));

    let totalTotal = 0;
    let totalBad = 0;

    const countries = ['NL', 'BE', 'LU', 'FR', 'DE', 'AT', 'IT', 'CH', 'ES', 'PT', 'GB'];
    for (const c of countries) {
        if (c in stats) {
            const s = stats[c];
            const ok = s.total - s.bad;
            const line = `${c:<8} ${String(s.total).padStart(6)} ${String(ok).padStart(6)} ${String(s.bad).padStart(6)}`;
            console.log(line);
            totalTotal += s.total;
            totalBad += s.bad;
        } else {
            const line = `${c:<8} ${String(0).padStart(6)} ${String(0).padStart(6)} ${String(0).padStart(6)}`;
            console.log(line);
        }
    }

    console.log('-'.repeat(30));
    const totalLine = `${'TOTAL':<8} ${String(totalTotal).padStart(6)} ${String(totalTotal - totalBad).padStart(6)} ${String(totalBad).padStart(6)}`;
    console.log(totalLine);

    console.log();
    console.log('=== BAD ENTRIES DETAIL ===');

    for (const c of countries) {
        if (c in stats && stats[c].bad > 0) {
            console.log(`\n--- ${c} (${stats[c].bad} bad entries) ---`);
            const bbox = BBOXES[c];
            console.log(`    bbox: lat ${bbox.lat[0]}-${bbox.lat[1]}, lon ${bbox.lon[0]}-${bbox.lon[1]}`);
            for (const e of stats[c].bad_entries) {
                const id = (e.id + '').padEnd(40);
                const name = (e.name + '').padEnd(45);
                const lat = (e.lat + '').padStart(18);
                const lon = (e.lon + '').padStart(18);
                console.log(`  BAD: ${id} | ${name} | lat ${lat} | lon ${lon} | source: ${e.source_verified}`);
            }
        }
    }

    process.exit(0);
} catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
}
