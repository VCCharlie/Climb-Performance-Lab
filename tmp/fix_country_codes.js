import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '..', 'src', 'climbs_extended.js');
let content = readFileSync(filePath, 'utf8');

// ─── 1. Parse all objects as text blocks ─────────────────────────────────────
// Each object starts with "  {" and ends with "  }," or "  }" (last entry)
const blockRegex = /\{[^{}]*\}/g;

let fixedCount = 0;
const fixedIds = [];

// ─── 2. Replace NL→BE for big_ entries with lat<50.75 or lon<3.30 ────────────
const newContent = content.replace(blockRegex, (block) => {
  const idMatch    = block.match(/"id"\s*:\s*"([^"]+)"/);
  const countryM   = block.match(/"country"\s*:\s*"([^"]+)"/);
  const latMatch   = block.match(/"lat"\s*:\s*([\d.eE+\-]+)/);
  const lonMatch   = block.match(/"lon"\s*:\s*([\-\d.eE+\-]+)/);

  if (!idMatch || !countryM || !latMatch || !lonMatch) return block;

  const id      = idMatch[1];
  const country = countryM[1];
  const lat     = parseFloat(latMatch[1]);
  const lon     = parseFloat(lonMatch[1]);

  if (id.startsWith('big_') && country === 'NL' && (lat < 50.75 || lon < 3.30)) {
    fixedIds.push({ id, lat, lon });
    fixedCount++;
    return block.replace(/"country"\s*:\s*"NL"/, '"country": "BE"');
  }

  return block;
});

// ─── 3. Fix es_torre_noordwest coords if they match the wrong values ──────────
let torreFixed = false;
const finalContent = newContent.replace(blockRegex, (block) => {
  const idMatch  = block.match(/"id"\s*:\s*"([^"]+)"/);
  if (!idMatch || idMatch[1] !== 'es_torre_noordwest') return block;

  const latMatch = block.match(/"lat"\s*:\s*([\d.eE+\-]+)/);
  const lonMatch = block.match(/"lon"\s*:\s*([\-\d.eE+\-]+)/);
  if (!latMatch || !lonMatch) return block;

  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);

  // Check if coords are near the wrong values (~44.619, ~10.346)
  if (Math.abs(lat - 44.619) < 0.1 && Math.abs(lon - 10.346) < 0.1) {
    torreFixed = true;
    let fixed = block.replace(/"lat"\s*:\s*[\d.eE+\-]+/, '"lat": 43.19');
    fixed     = fixed.replace(/"lon"\s*:\s*[\-\d.eE+\-]+/, '"lon": -5.85');
    return fixed;
  }

  console.log(`  es_torre_noordwest current coords: lat=${lat}, lon=${lon} — no change needed`);
  return block;
});

writeFileSync(filePath, finalContent, 'utf8');

// ─── 4. Report ────────────────────────────────────────────────────────────────
console.log(`\n✅ Fixed ${fixedCount} big_ entries: NL → BE`);
fixedIds.forEach(({ id, lat, lon }) => console.log(`   ${id}  lat=${lat}  lon=${lon}`));

if (torreFixed) {
  console.log('\n✅ Fixed es_torre_noordwest: lat → 43.19, lon → -5.85');
} else {
  console.log('\nℹ️  es_torre_noordwest: no coord fix needed (coords already correct or not ~44.619/10.346)');
}

// ─── 5. Verify: count remaining big_ + NL + (lat<50.75 or lon<3.30) ──────────
const verifyRegex = /\{[^{}]*\}/g;
const verContent  = finalContent;
let remaining = 0;
let match;
while ((match = verifyRegex.exec(verContent)) !== null) {
  const b = match[0];
  const idM  = b.match(/"id"\s*:\s*"([^"]+)"/);
  const cM   = b.match(/"country"\s*:\s*"([^"]+)"/);
  const latM = b.match(/"lat"\s*:\s*([\d.eE+\-]+)/);
  const lonM = b.match(/"lon"\s*:\s*([\-\d.eE+\-]+)/);
  if (!idM || !cM || !latM || !lonM) continue;
  if (idM[1].startsWith('big_') && cM[1] === 'NL' && (parseFloat(latM[1]) < 50.75 || parseFloat(lonM[1]) < 3.30)) {
    remaining++;
    console.log(`  REMAINING: ${idM[1]}  lat=${latM[1]} lon=${lonM[1]}`);
  }
}
console.log(`\n🔍 Remaining big_ entries with NL + (lat<50.75 or lon<3.30): ${remaining}`);
