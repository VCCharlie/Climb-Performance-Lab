import { readFileSync } from 'fs';

const filePath = new URL('../src/climbs_extended.js', import.meta.url).pathname.replace(/^\//, '');
const content = readFileSync(filePath, 'utf-8');

const start = content.indexOf('[');
const end = content.lastIndexOf(']') + 1;
const rawJson = content.slice(start, end);

const climbs = JSON.parse(rawJson);
console.log(`Total climbs parsed: ${climbs.length}`);

const BOUNDS = {
  NL: [50.75, 53.60,  3.30,  7.30],
  BE: [49.50, 51.55,  2.50,  6.55],
  LU: [49.40, 50.20,  5.70,  6.55],
  FR: [41.30, 51.10, -5.20,  9.70],
  DE: [47.27, 55.10,  5.87, 15.05],
  AT: [46.37, 49.02,  9.53, 17.20],
  IT: [35.49, 47.10,  6.62, 18.55],
  CH: [45.82, 47.81,  5.95, 10.55],
  ES: [35.17, 43.82, -9.40,  4.60],
  PT: [36.83, 42.20, -9.52, -6.19],
  GB: [49.87, 60.90, -8.65,  1.77],
};

const totals = {};
const issues = {};

for (const c of climbs) {
  const country = (c.country || '').toUpperCase().trim();
  if (country === 'ZWIFT') continue;

  const lat = c.lat;
  const lon = c.lon;
  const cid = c.id || '?';
  const name = c.name || '?';
  const source = c.source_verified ?? c.source ?? '?';

  if (!BOUNDS[country]) {
    totals[country] = (totals[country] || 0) + 1;
    continue;
  }

  totals[country] = (totals[country] || 0) + 1;
  if (!issues[country]) issues[country] = [];

  if (lat == null || lon == null) {
    issues[country].push(`${cid} | ${name} | lat=MISSING lon=MISSING | source=${source}`);
    continue;
  }

  const [latMin, latMax, lonMin, lonMax] = BOUNDS[country];
  if (lat < latMin || lat > latMax || lon < lonMin || lon > lonMax) {
    issues[country].push(`${cid} | ${name} | lat=${lat} lon=${lon} | source=${source}`);
  }
}

console.log('\n=== SUMMARY ===');
for (const country of Object.keys(totals).sort()) {
  const bad = (issues[country] || []).length;
  console.log(`${country.padEnd(6)} total: ${String(totals[country]).padEnd(5)} bad: ${bad}`);
}

for (const country of Object.keys(issues).sort()) {
  const lst = issues[country];
  if (lst.length) {
    console.log(`\n=== ${country} ISSUES (${lst.length}) ===`);
    for (const line of lst) console.log(line);
  }
}
