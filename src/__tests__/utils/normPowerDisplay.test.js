import { describe, it, expect } from 'vitest';
import { getNormPowerDisplay } from '../../utils/normPowerDisplay.js';

describe('getNormPowerDisplay', () => {
    it('colors NP by Coggan zone using profile FTP', () => {
        const display = getNormPowerDisplay(255, 300);
        expect(display.watts).toBe(255);
        expect(display.zoneName).toBe('Z3 Tempo');
        expect(display.color).toBe('#22c55e');
        expect(display.title).toContain('85% FTP');
    });

    it('falls back without FTP', () => {
        const display = getNormPowerDisplay(255, 0);
        expect(display.watts).toBe(255);
        expect(display.color).toBe(null);
        expect(display.title).toContain('set FTP');
    });
});
