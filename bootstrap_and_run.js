const fs = require('fs');
const path = require('path');

// Create C:\Temp directory if it doesn't exist
const tempDir = 'C:\\Temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`Created directory: ${tempDir}`);
}

// Now create the validation script
const scriptContent = `const fs = require('fs');
const path = require('path');

const BBOXES = {
  NL: { latMin: 50.75, latMax: 53.60, lonMin: 3.30, lonMax: 7.30 },
  BE: { latMin: 49.50, latMax: 51.55, lonMin: 2.50, lonMax: 6.55 },
  LU: { latMin: 49.40, latMax: 50.20, lonMin: 5.70, lonMax: 6.55 },
  FR: { latMin: 41.30, latMax: 51.10, lonMin: -5.20, lonMax: 9.70 },
  DE: { latMin: 47.27, latMax: 55.10, lonMin: 5.87, lonMax: 15.05 },
  AT: { latMin: 46.37, latMax: 49.02, lonMin: 9.53, lonMax: 17.20 },
  IT: { latMin: 35.49, latMax: 47.10, lonMin: 6.62, lonMax: 18.55 },
  CH: { latMin: 45.82, latMax: 47.81, lonMin: 5.95, lonMax: 10.55 },
  ES: { latMin: 35.17, latMax: 43.82, lonMin: -9.40, lonMax: 4.60 },
  PT: { latMin: 36.83, latMax: 42.20, lonMin: -9.52, lonMax: -6.19 },
  GB: { latMin: 49.87, latMax: 60.90, lonMin: -8.65, lonMax: 1.77 },
};

// Read and parse the climbs_extended.js file
let src = fs.readFileSync('C:/Users/vc_ch/Documents/GitHub/Climb-Performance-Lab/src/climbs_extended.js', 'utf8');
src = src.replace(/^export\\s+const\\s+/gm, 'const ');

// Use Function constructor to evaluate and extract RAW_CLIMBS
const fn = new Function(src + '\\nreturn RAW_CLIMBS;');
const RAW_CLIMBS = fn();

// Validate entries
const stats = {};
const badEntries = {};

RAW_CLIMBS.forEach(entry => {
  // Skip ZWIFT entries
  if (entry.country === 'ZWIFT') {
    return;
  }

  // Skip entries with country not in BBOXES
  if (!BBOXES[entry.country]) {
    return;
  }

  // Initialize stats for this country if not exists
  if (!stats[entry.country]) {
    stats[entry.country] = { total: 0, bad: 0 };
    badEntries[entry.country] = [];
  }

  stats[entry.country].total++;

  const bbox = BBOXES[entry.country];
  const lat = entry.lat;
  const lon = entry.lon;

  // Check if coordinates are within bbox
  const isOutside = lat < bbox.latMin || lat > bbox.latMax || 
                    lon < bbox.lonMin || lon > bbox.lonMax;

  if (isOutside) {
    stats[entry.country].bad++;
    const sourceUrl = entry.url || entry.bigUrl || 'no source';
    badEntries[entry.country].push({
      id: entry.id,
      name: entry.name,
      lat,
      lon,
      source_url: sourceUrl
    });
  }
});

// Calculate total entries
const totalEntries = Object.values(stats).reduce((sum, s) => sum + s.total, 0);

// Print output
console.log(\`Total entries: \${totalEntries}\\n\`);
console.log('=== SUMMARY ===');
Object.keys(stats).sort().forEach(country => {
  const s = stats[country];
  console.log(\`\${country}: \${s.total} total, \${s.bad} bad\`);
});

console.log('\\n=== BAD ENTRIES ===');
Object.keys(badEntries).sort().forEach(country => {
  if (badEntries[country].length > 0) {
    console.log(\`--- \${country} ---\`);
    badEntries[country].forEach(entry => {
      console.log(\`  \${entry.id} | \${entry.name} | lat=\${entry.lat} | lon=\${entry.lon} | \${entry.source_url}\`);
    });
  }
});`;

fs.writeFileSync(path.join(tempDir, 'validate_gps.js'), scriptContent);
console.log(`Created script: ${path.join(tempDir, 'validate_gps.js')}`);

// Execute the validation script
console.log('\n========== RUNNING VALIDATION SCRIPT ==========\n');
require('child_process').execSync(`node "${path.join(tempDir, 'validate_gps.js')}"`, { stdio: 'inherit' });
