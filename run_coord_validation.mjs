/**
 * GPS Coordinate Validation Script
 * Reads climbs_extended.js, parses all climb entries, validates GPS coordinates
 * against country bounding boxes, and writes a report to validation_output.txt
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BOUNDING_BOXES = {
  FR: { lat: [41.3, 51.1], lng: [-5.1, 9.6] },
  IT: { lat: [36.6, 47.1], lng: [6.6, 18.5] },
  CH: { lat: [45.8, 47.8], lng: [5.9, 10.5] },
  ES: { lat: [35.9, 43.8], lng: [-9.3, 4.3] },
  BE: { lat: [49.5, 51.5], lng: [2.5, 6.4] },
  NL: { lat: [50.8, 53.6], lng: [3.3, 7.2] },
  DE: { lat: [47.3, 55.1], lng: [5.9, 15.0] },
  AT: { lat: [46.4, 49.0], lng: [9.5, 17.2] },
  PT: { lat: [36.8, 42.2], lng: [-9.5, -6.2] },
  GB: { lat: [49.9, 61.0], lng: [-8.2, 2.0] },
};

function extractField(block, fieldName) {
  // Try string value first
  let m = block.match(new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`));
  if (m) return m[1];
  // Then numeric / unquoted value
  m = block.match(new RegExp(`"${fieldName}"\\s*:\\s*([^\\s,\\n\\}]+)`));
  if (m) return m[1].trim();
  return null;
}

function parseNumber(v) {
  if (v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseClimbs(jsContent) {
  const rawMatch = jsContent.match(/const RAW_CLIMBS\s*=\s*\[/);
  if (!rawMatch) throw new Error('Could not find RAW_CLIMBS in file');

  const start = rawMatch.index + rawMatch[0].length;
  const climbs = [];
  let depth = 0;
  let objStart = null;

  for (let i = start; i < jsContent.length; i++) {
    const ch = jsContent[i];
    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== null) {
        const block = jsContent.slice(objStart, i + 1);
        const name = extractField(block, 'name');
        const country = extractField(block, 'country');
        const id = extractField(block, 'id');
        const lat = parseNumber(extractField(block, 'lat'));
        const lng = parseNumber(extractField(block, 'lon') ?? extractField(block, 'lng'));

        if (name || id) {
          climbs.push({ id: id || '', name: name || id || '(unnamed)', country: country || '', lat, lng });
        }
        objStart = null;
      }
    } else if (ch === ']' && depth === 0) {
      // End of array
      break;
    }
  }

  return climbs;
}

function validateClimb(climb) {
  const country = climb.country.toUpperCase();
  if (country === 'ZWIFT') return { status: 'skip', bbox: null };

  const { lat, lng } = climb;
  if (lat == null || lng == null) return { status: 'missing', bbox: null };

  const bbox = BOUNDING_BOXES[country];
  if (!bbox) return { status: 'skip', bbox: null }; // unknown country

  const latOk = lat >= bbox.lat[0] && lat <= bbox.lat[1];
  const lngOk = lng >= bbox.lng[0] && lng <= bbox.lng[1];

  return { status: latOk && lngOk ? 'valid' : 'invalid', bbox };
}

function generateReport(climbs) {
  const invalid = [];
  const missing = [];
  let validCount = 0;
  let hasCoords = 0;

  for (const climb of climbs) {
    const country = climb.country.toUpperCase();
    if (country === 'ZWIFT') {
      if (climb.lat != null && climb.lng != null) hasCoords++;
      continue;
    }

    const { status, bbox } = validateClimb(climb);
    if (status === 'missing') {
      missing.push(climb);
    } else if (status === 'valid') {
      hasCoords++;
      validCount++;
    } else if (status === 'invalid') {
      hasCoords++;
      invalid.push({ climb, bbox });
    }
    // skip = unknown country, don't count
  }

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

  const lines = [
    'GPS Coordinate Validation Report',
    `Generated: ${timestamp}`,
    `Total climbs: ${climbs.length}`,
    `Climbs with coordinates: ${hasCoords}`,
    `Valid coordinates: ${validCount}`,
    `Invalid coordinates: ${invalid.length}`,
    `Missing coordinates: ${missing.length}`,
    '',
  ];

  if (invalid.length > 0) {
    lines.push('INVALID COORDINATES:');
    for (const { climb, bbox } of invalid) {
      lines.push(
        `- ${climb.name} (${climb.country}): lat=${climb.lat}, lng=${climb.lng} - OUTSIDE bounding box`
      );
      lines.push(
        `  Expected: lat ${bbox.lat[0]}-${bbox.lat[1]}, lng ${bbox.lng[0]}-${bbox.lng[1]}`
      );
    }
    lines.push('');
  }

  if (missing.length > 0) {
    lines.push('MISSING COORDINATES:');
    for (const climb of missing) {
      lines.push(`- ${climb.name} (${climb.country}): No GPS coordinates found`);
    }
    lines.push('');
  }

  if (invalid.length === 0 && missing.length === 0) {
    lines.push('All climbs with known countries have valid coordinates!');
  }

  return lines.join('\n');
}

// Main
const inputPath = join(__dirname, 'src', 'climbs_extended.js');
const outputPath = join(__dirname, 'validation_output.txt');

console.log(`Reading: ${inputPath}`);
const content = readFileSync(inputPath, 'utf8');

console.log('Parsing climbs...');
const climbs = parseClimbs(content);
console.log(`Found ${climbs.length} climbs`);

const report = generateReport(climbs);
writeFileSync(outputPath, report, 'utf8');
console.log(`\nReport saved to: ${outputPath}`);
console.log('\n' + report);
