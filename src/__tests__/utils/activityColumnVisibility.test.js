import { describe, it, expect } from 'vitest';
import {
    getDefaultVisibleKeys,
    resolvePresetKeys,
    parseStoredColumnKeys,
    detectActivePreset,
    columnsForVisibleKeys,
    toggleColumnKey,
} from '../../utils/activityColumnVisibility';
import { ACTIVITY_TABLE_COLUMNS } from '../../config';

describe('activityColumnVisibility', () => {
    it('default visible keys match essential preset', () => {
        const defaults = getDefaultVisibleKeys();
        const essential = resolvePresetKeys('essential');
        expect(defaults).toEqual(essential);
    });

    it('includes extended power duration columns in table column list', () => {
        const keys = ACTIVITY_TABLE_COLUMNS.map((c) => c.key);
        expect(keys).toContain('best_90min');
        expect(keys).toContain('best_120min');
        expect(keys).toContain('best_150min');
        expect(keys).toContain('best_180min');
        const b90 = ACTIVITY_TABLE_COLUMNS.find((c) => c.key === 'best_90min');
        expect(b90?.label).toBe('90m');
        expect(b90?.hideByDefault).toBe(true);
    });

    it('power preset includes 90m and 120m columns', () => {
        const power = resolvePresetKeys('power');
        expect(power).toContain('best_90min');
        expect(power).toContain('best_120min');
    });

    it('parseStoredColumnKeys ignores invalid keys', () => {
        const parsed = parseStoredColumnKeys(JSON.stringify(['date', 'not_a_column', 'load']));
        expect(parsed).toEqual(['date', 'load']);
    });

    it('parseStoredColumnKeys returns null for empty result', () => {
        expect(parseStoredColumnKeys(JSON.stringify(['bogus']))).toBeNull();
        expect(parseStoredColumnKeys('not-json')).toBeNull();
    });

    it('detectActivePreset identifies essential and custom', () => {
        expect(detectActivePreset(resolvePresetKeys('essential'))).toBe('essential');
        expect(detectActivePreset(['date', 'title'])).toBe('custom');
    });

    it('columnsForVisibleKeys preserves table column order', () => {
        const keys = ['load', 'date', 'title'];
        const cols = columnsForVisibleKeys(keys);
        expect(cols.map((c) => c.key)).toEqual(['date', 'title', 'load']);
    });

    it('toggleColumnKey prevents hiding the last column', () => {
        const only = ['date'];
        expect(toggleColumnKey(only, 'date')).toEqual(['date']);
    });

    it('toggleColumnKey adds and removes keys', () => {
        const base = ['date', 'title'];
        expect(toggleColumnKey(base, 'load')).toContain('load');
        expect(toggleColumnKey(base, 'date')).toEqual(['title']);
    });
});
