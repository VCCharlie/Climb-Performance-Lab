const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src', 'climbs_extended.js');
const content = fs.readFileSync(filepath, 'utf-8');

// Extract climbs data
// Find the RAW_CLIMBS array
const match = content.match(/const RAW_CLIMBS = \[([\s\S]*?)\];/);
if (!match) {
  console.log('Could not find RAW_CLIMBS array');
  process.exit(1);
}

const climbsStr = '[' + match[1] + ']';

// Parse the data
let climbs;
try {
  // Use Function constructor to evaluate the array
  climbs = eval('(' + climbsStr + ')');
} catch (e) {
  console.log('Error parsing climbs data:', e.message);
  process.exit(1);
}

// Count big_ entries with BE (the fixed ones) and remaining wrong big_ NL entries
let beFixed = 0;
let wrongNl = [];

for (const climb of climbs) {
  if (!climb.id || !climb.id.startsWith('big_')) {
    continue;
  }
  
  if (!climb.country || (climb.country !== 'NL' && climb.country !== 'BE')) {
    continue;
  }
  
  if (!climb.lat || !climb.lon) {
    continue;
  }
  
  const lat = parseFloat(climb.lat);
  const lon = parseFloat(climb.lon);
  const country = climb.country;
  
  if (country === 'BE' && (lat < 50.75 || lon < 3.30)) {
    beFixed++;
  }
  if (country === 'NL' && (lat < 50.75 || lon < 3.30)) {
    wrongNl.push(`${climb.id}: lat=${lat}, lon=${lon}`);
  }
}

console.log(`Fixed big_ entries (now BE, lat<50.75 or lon<3.30): ${beFixed}`);
console.log(`Remaining wrong (big_ NL with lat<50.75 or lon<3.30): ${wrongNl.length}`);
for (const w of wrongNl) {
  console.log(`  ${w}`);
}
