#!/usr/bin/env node
/**
 * Remove climbs with missing core metrics from climbs_extended RAW_CLIMBS.
 * Run from repo root: node scripts/pruneIncompleteClimbsExtended.mjs
 * Review git diff before committing — large file rewrite.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isClimbMetricsComplete } from '../src/utils/climbDataQuality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, '../src/climbs_extended.js');

const mod = await import(pathToFileURL(target).href);
const raw = mod.CLIMB_DATABASE;
const kept = raw.filter((c) => isClimbMetricsComplete(c));
const removed = raw.length - kept.length;

console.log(`Climbs: ${raw.length} → ${kept.length} (remove ${removed} incomplete)`);

const prefix = fs.readFileSync(target, 'utf8').split('const RAW_CLIMBS = [')[0];
const suffix = 'const RAW_CLIMBS = [\n'
    + kept.map((c) => `  ${JSON.stringify(c, null, 2).replace(/\n/g, '\n  ')}`).join(',\n')
    + '\n];export const CLIMB_DATABASE = RAW_CLIMBS;\n';

fs.writeFileSync(target, prefix + suffix, 'utf8');
console.log('Wrote', target);
