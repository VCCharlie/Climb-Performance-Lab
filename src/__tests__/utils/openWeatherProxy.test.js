import { describe, it, expect } from 'vitest';
import { hasLocalOpenWeatherKey } from '../../services/openWeatherProxy.js';

describe('openWeatherProxy', () => {
    it('detects local OpenWeather API key', () => {
        expect(hasLocalOpenWeatherKey('abc')).toBe(true);
        expect(hasLocalOpenWeatherKey('')).toBe(false);
        expect(hasLocalOpenWeatherKey(null)).toBe(false);
    });
});
