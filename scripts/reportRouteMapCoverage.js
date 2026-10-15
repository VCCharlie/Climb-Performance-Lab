#!/usr/bin/env node
/**
 * Print route polyline coverage from a Settings JSON backup (activities array).
 *
 * Usage:
 *   node scripts/reportRouteMapCoverage.js path/to/climb_lab_backup_YYYY-MM-DD.json
 *   node scripts/reportRouteMapCoverage.js backup.json --list-missing
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    formatRouteMapCoverageSummary,
    summarizeActivityRouteMapCoverage,
} from '../src/utils/activityRouteMapCoverage.js';

const args = process.argv.slice(2);
const listMissing = args.includes('--list-missing');
const fileArg = args.find((a) => !a.startsWith('--'));

if (!fileArg) {
    console.error('Usage: node scripts/reportRouteMapCoverage.js <backup.json> [--list-missing]');
    process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
let parsed;
try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
} catch (err) {
    console.error(`Could not read JSON: ${err?.message || err}`);
    process.exit(1);
}

const activities = Array.isArray(parsed?.activities) ? parsed.activities : [];
if (!activities.length) {
    console.warn('No activities array in backup (or empty).');
}

const summary = summarizeActivityRouteMapCoverage(activities);
console.log(formatRouteMapCoverageSummary(summary));

if (listMissing && summary.missingActivities.length > 0) {
    console.log('\nMissing route map:');
    for (const row of summary.missingActivities) {
        const date = row.date ? String(row.date).split('T')[0] : '?';
        const title = row.title || '(no title)';
        const type = row.type ? ` [${row.type}]` : '';
        console.log(`  ${date}  ${row.id}  ${title}${type}`);
    }
}
