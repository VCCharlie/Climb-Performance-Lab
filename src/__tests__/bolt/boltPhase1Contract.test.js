import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');

function readSrc(relativePath) {
    return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('Bolt Phase 1 contract (live on main)', () => {
    it('1.1 removes unused framer-motion dependency', () => {
        const pkg = readSrc('package.json');
        expect(pkg).not.toMatch(/"framer-motion"/);
    });

    it('1.3 memoizes PerformanceModule chart series', () => {
        const source = readSrc('src/components/PerformanceModule.jsx');
        expect(source).toMatch(/const chartSeries = React\.useMemo/);
        expect(source).toMatch(/const rideSplit = React\.useMemo/);
        expect(source).toMatch(/const axisTicks = React\.useMemo/);
    });

    it('1.4 uses single-pass reduce for heatmap max km', () => {
        const source = readSrc('src/components/dashboard/charts/ActivityHeatmap.jsx');
        expect(source).toMatch(/Object\.values\(byDay\)\.reduce\(\(max, km\) => Math\.max\(max, km\), 0\)/);
        expect(source).not.toMatch(/Math\.max\(\.\.\.Object\.values/);
    });

    it('1.5 memoizes shell navigation components', () => {
        expect(readSrc('src/components/Header.jsx')).toMatch(/export default React\.memo\(Header\)/);
        expect(readSrc('src/components/shell/MainNav.jsx')).toMatch(/export default React\.memo\(MainNav\)/);
    });

    it('1.6 keeps Strava handlers stable via hook useCallback', () => {
        const source = readSrc('src/hooks/useDataHubStravaEnrich.js');
        expect(source).toMatch(/const handleFindOnStrava = useCallback/);
    });

    it('1.7 memoizes allVisibleSelected for bulk selection', () => {
        const source = readSrc('src/hooks/useDataHubBulkActions.js');
        expect(source).toMatch(/const allVisibleSelected = useMemo\(/);
    });
});
