import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { INTERVALS_LIST_ACTIVITY_FIELDS } from '../../utils/intervals';

function extractPythonIntervalsListFields() {
    const pyPath = resolve(process.cwd(), 'cloud-function/main.py');
    const source = readFileSync(pyPath, 'utf-8');
    const marker = 'INTERVALS_LIST_ACTIVITY_FIELDS = ",".join([';
    const start = source.indexOf(marker);
    if (start < 0) throw new Error('Python INTERVALS_LIST_ACTIVITY_FIELDS block not found');
    const listStart = start + marker.length;
    const listEnd = source.indexOf('])', listStart);
    const block = source.slice(listStart, listEnd);
    const fields = [];
    const re = /"([^"]+)"/g;
    let match = re.exec(block);
    while (match) {
        fields.push(match[1]);
        match = re.exec(block);
    }
    return fields;
}

describe('Intervals list API field parity (JS vs Python)', () => {
    it('INTERVALS_LIST_ACTIVITY_FIELDS matches cloud-function/main.py', () => {
        const jsFields = INTERVALS_LIST_ACTIVITY_FIELDS.split(',').map((s) => s.trim()).filter(Boolean);
        const pyFields = extractPythonIntervalsListFields();
        expect(jsFields).toEqual(pyFields);
    });
});
