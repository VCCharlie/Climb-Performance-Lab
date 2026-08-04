import { describe, it, expect } from 'vitest';
import { estimateSessionTss, resolveSessionTssForForecast } from '../../utils/coach/coachSessionTss';
import { buildFitnessForecast } from '../../utils/coach/coachFitnessForecast';
import { normalizeQuickLinks, resolveQuickLinks, MAX_QUICK_LINKS } from '../../utils/quickLinks';

describe('coachSessionTss', () => {
    it('estimateSessionTss returns 0 for rest', () => {
        expect(estimateSessionTss('rest', 5)).toBe(0);
    });

    it('estimateSessionTss scales endurance with weekly hours', () => {
        expect(estimateSessionTss('endurance', 4)).toBeLessThan(estimateSessionTss('endurance', 7));
    });

    it('resolveSessionTssForForecast prefers actual logged TSS', () => {
        const tss = resolveSessionTssForForecast(
            { date: '2026-08-01', stimulus: 'sweetspot', completed: false },
            5,
            { '2026-08-01': 120 },
        );
        expect(tss).toBe(120);
    });
});

describe('coachFitnessForecast', () => {
    const activities = [
        { id: '1', date: '2026-07-28', load: 80 },
        { id: '2', date: '2026-07-30', load: 90 },
        { id: '3', date: '2026-08-01', load: 60 },
    ];

    const weekSessions = [
        { date: '2026-08-04', plannedStimulus: 'sweetspot', completed: false },
        { date: '2026-08-06', plannedStimulus: 'endurance', completed: false },
    ];

    it('buildFitnessForecast returns actual and projected rows', () => {
        const { chartData, summary } = buildFitnessForecast({
            activities,
            week1Sessions: weekSessions,
            weeklyHours: 5,
            referenceYmd: '2026-08-01',
            historyDays: 14,
            forecastDays: 7,
        });
        expect(chartData.length).toBeGreaterThan(0);
        expect(chartData.some((r) => r.projected)).toBe(true);
        expect(chartData.some((r) => !r.projected)).toBe(true);
        expect(typeof summary.currentTsb).toBe('number');
        expect(typeof summary.projectedEndTsb).toBe('number');
    });
});

describe('quickLinks', () => {
    it('normalizeQuickLinks falls back to defaults when empty', () => {
        const links = normalizeQuickLinks([]);
        expect(links.length).toBe(3);
        expect(links[0].label).toBe('Cycling Pack');
    });

    it('normalizeQuickLinks caps at MAX_QUICK_LINKS', () => {
        const many = Array.from({ length: 8 }, (_, i) => ({
            id: `l${i}`,
            label: `Link ${i}`,
            href: `https://example.com/${i}`,
            icon: 'link',
        }));
        expect(normalizeQuickLinks(many).length).toBe(MAX_QUICK_LINKS);
    });

    it('resolveQuickLinks uses user settings when valid', () => {
        const links = resolveQuickLinks({
            quickLinks: [{ id: 'x', label: 'My Site', href: 'https://example.com', icon: 'bike' }],
        });
        expect(links).toHaveLength(1);
        expect(links[0].label).toBe('My Site');
    });
});
