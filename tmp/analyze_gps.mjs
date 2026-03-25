import { readFileSync } from "fs";

const path = "C:\\Users\\vc_ch\\Documents\\GitHub\\Climb-Performance-Lab\\src\\climbs_extended.js";
const content = readFileSync(path, "utf-8");

// Skip COGGAN_ZONES (first array) — find the second '[' which opens RAW_CLIMBS
const firstBracket = content.indexOf("[");
const start = content.indexOf("[", firstBracket + 1);
const end   = content.lastIndexOf("]") + 1;
const climbs = JSON.parse(content.slice(start, end));

const BOXES = {
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
  const country = (c.country || "").trim().toUpperCase();
  if (country === "ZWIFT") continue;

  totals[country] = (totals[country] || 0) + 1;

  const lat = c.lat;
  const lon = c.lon;

  if (lat == null || lon == null) {
    (issues[country] = issues[country] || []).push(
      `${c.id || "?"} | ${c.name || "?"} | lat=MISSING lon=MISSING`
    );
    continue;
  }

  const box = BOXES[country];
  if (!box) continue;

  const [latMin, latMax, lonMin, lonMax] = box;
  if (!(lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax)) {
    const src = c.source_verified || c.source || "-";
    (issues[country] = issues[country] || []).push(
      `${c.id || "?"} | ${c.name || "?"} | lat=${lat} lon=${lon} | source=${src}`
    );
  }
}

// Summary
console.log("=== SUMMARY ===");
const allCountries = [...new Set([...Object.keys(totals), ...Object.keys(issues)])].sort();
for (const cc of allCountries) {
  const tot = totals[cc] || 0;
  const bad = (issues[cc] || []).length;
  console.log(`${cc.padEnd(6)} total: ${String(tot).padStart(4)}  bad: ${String(bad).padStart(3)}`);
}

// Detail
for (const cc of allCountries) {
  const list = issues[cc] || [];
  if (!list.length) continue;
  console.log(`\n=== ${cc} ISSUES (${list.length}) ===`);
  for (const line of list) console.log(line);
}
