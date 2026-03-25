#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  // Read and parse the climbs file
  const filePath = path.join(__dirname, 'src', 'climbs_extended.js');
  const content = fs.readFileSync(filePath, 'utf-8');

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

  // Extract and parse JSON from JS file
  const jsonMatch = content.match(/(?:export\s+const\s+CLIMB_DATABASE\s*=\s*)?(\[[\s\S]*?\]);?(?:export)?/);
  if (!jsonMatch) {
      console.error('Could not find array in file');
      process.exit(1);
  }

  let data;
  try {
      data = JSON.parse(jsonMatch[1]);
  } catch (e) {
      console.error('JSON parse failed:', e.message);
      // Try alternative extraction
      const alt = content.match(/const RAW_CLIMBS = (\[[\s\S]*?\]);/);
      if (alt) {
          data = JSON.parse(alt[1]);
      } else {
          throw e;
      }
  }

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
  console.log(`${'Country':<8} ${'Total':>6} ${'OK':>6} ${'BAD':>6}`);
  console.log('-'.repeat(30));

  let totalTotal = 0;
  let totalBad = 0;

  for (const c of ['NL', 'BE', 'LU', 'FR', 'DE', 'AT', 'IT', 'CH', 'ES', 'PT', 'GB']) {
      if (c in stats) {
          const s = stats[c];
          const ok = s.total - s.bad;
          console.log(`${c:<8} ${s.total.toString().padStart(6)} ${ok.toString().padStart(6)} ${s.bad.toString().padStart(6)}`);
          totalTotal += s.total;
          totalBad += s.bad;
      } else {
          console.log(`${c:<8} ${0.toString().padStart(6)} ${0.toString().padStart(6)} ${0.toString().padStart(6)}`);
      }
  }

  console.log('-'.repeat(30));
  console.log(`${'TOTAL':<8} ${totalTotal.toString().padStart(6)} ${(totalTotal - totalBad).toString().padStart(6)} ${totalBad.toString().padStart(6)}`);

  console.log();
  console.log('=== BAD ENTRIES DETAIL ===');

  for (const c of ['NL', 'BE', 'LU', 'FR', 'DE', 'AT', 'IT', 'CH', 'ES', 'PT', 'GB']) {
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

  console.log('\nValidation complete.');
  process.exit(0);

} catch (error) {
  console.error('Error during validation:', error);
  console.error(error.stack);
  process.exit(1);
}
