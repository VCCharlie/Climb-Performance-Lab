/**
 * verify-coordinates.mjs
 * 
 * Checks all climbs in climbs_extended.js against expected geographic
 * bounding boxes per country. Reports entries with coordinates outside
 * the expected range (likely Nominatim geocoding errors).
 *
 * Usage: node scripts/verify-coordinates.mjs [--country NL] [--source-only]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const climbsFile = path.join(__dirname, '../src/climbs_extended.js');

// Expected bounding boxes per country code
// Format: [minLat, maxLat, minLon, maxLon]
const COUNTRY_BBOX = {
  NL: [50.75, 53.60,  3.30,  7.30],  // Netherlands
  BE: [49.50, 51.55,  2.50,  6.55],  // Belgium
  LU: [49.40, 50.20,  5.70,  6.55],  // Luxembourg
  FR: [41.30, 51.10, -5.20,  9.70],  // France (incl. Corsica)
  DE: [47.27, 55.10,  5.87, 15.05],  // Germany
  AT: [46.37, 49.02,  9.53, 17.20],  // Austria
  IT: [35.49, 47.10,  6.62, 18.55],  // Italy
  CH: [45.82, 47.81,  5.95, 10.55],  // Switzerland
  ES: [35.17, 43.82, -9.40,  4.60],  // Spain
  PT: [36.83, 42.20, -9.52, -6.19],  // Portugal
  GB: [49.87, 60.90, -8.65,  1.77],  // Great Britain
  ZWIFT: null,                         // virtual - skip
};

// CLI args
const args = process.argv.slice(2);
const filterCountry = args.includes('--country') ? args[args.indexOf('--country') + 1] : null;
const nominatimOnly = args.includes('--source-only');

// Parse the JS file to get the RAW_CLIMBS array
const content = readFileSync(climbsFile, 'utf-8');

// The file contains multiple variables (COGGAN_ZONES, RAW_CLIMBS, CLIMB_DATABASE).
// We specifically target the RAW_CLIMBS array which holds the climb data.
let climbs;
const rawMatch = content.match(/const\s+RAW_CLIMBS\s*=\s*(\[[\s\S]*\]);/);
if (rawMatch) {
  climbs = JSON.parse(rawMatch[1]);
} else {
  // Fallback: find the second '[' (skip COGGAN_ZONES) and parse to the last ']'
  const first = content.indexOf('[');
  const second = content.indexOf('[', first + 1);
  const last = content.lastIndexOf(']') + 1;
  if (second !== -1 && last > second) {
    climbs = JSON.parse(content.slice(second, last));
  } else {
    console.error('Could not parse climbs_extended.js — unexpected format');
    process.exit(1);
  }
}

console.log(`Total entries: ${climbs.length}\n`);

// Group results by country
const issues = {};
const stats = {};

for (const climb of climbs) {
  const { id, name, country, lat, lon, source_verified } = climb;

  if (!country) continue;
  if (filterCountry && country !== filterCountry) continue;
  if (nominatimOnly && source_verified !== 'Nominatim') continue;
  if (!stats[country]) stats[country] = { total: 0, ok: 0, bad: 0, noCoords: 0 };
  stats[country].total++;

  const bbox = COUNTRY_BBOX[country];
  if (bbox === null) { stats[country].ok++; continue; } // skip Zwift etc.
  if (!bbox) { stats[country].ok++; continue; } // unknown country - skip

  if (lat == null || lon == null) {
    stats[country].noCoords++;
    continue;
  }

  const [minLat, maxLat, minLon, maxLon] = bbox;
  const inBounds = lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;

  if (!inBounds) {
    stats[country].bad++;
    if (!issues[country]) issues[country] = [];
    issues[country].push({
      id,
      name,
      lat,
      lon,
      source: source_verified || 'unknown',
    });
  } else {
    stats[country].ok++;
  }
}

// Print summary
console.log('=== SUMMARY PER COUNTRY ===');
const countriesWithIssues = Object.keys(stats).sort();
for (const c of countriesWithIssues) {
  const s = stats[c];
  const issueCount = issues[c]?.length ?? 0;
  const flag = issueCount > 0 ? ' ⚠️' : ' ✅';
  console.log(`${c.padEnd(6)} total:${String(s.total).padStart(4)}  ok:${String(s.ok).padStart(4)}  bad:${String(issueCount).padStart(4)}${flag}`);
}

// Print details per country
console.log('\n=== ISSUES PER COUNTRY ===\n');
for (const [country, list] of Object.entries(issues).sort()) {
  if (list.length === 0) continue;
  console.log(`--- ${country} (${list.length} issues) ---`);
  for (const item of list) {
    console.log(`  [${item.source.padEnd(10)}] ${item.id.padEnd(35)} lat=${item.lat}, lon=${item.lon}  → "${item.name}"`);
  }
  console.log();
}
