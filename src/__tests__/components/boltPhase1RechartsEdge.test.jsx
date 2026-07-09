import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import PerformanceModule from '../../components/PerformanceModule.jsx';

/**
 * Uses real Recharts (no mock) to catch production-only chart crashes.
 */
describe('Bolt Phase 1 Recharts edge cases', () => {
  it('does not throw with invalid tick dates and null activity dates', () => {
    const data = [
      { id: '1', date: null, type: 'Ride', load: 10, ftp: 200, eFTP: 190, distance: 10, moving_time: 3600 },
      { id: '2', date: '2026-02-01', type: 'Ride', load: 20, ftp: 200, eFTP: 195, distance: 20, moving_time: 3600 },
    ];
    expect(() =>
      render(
        <PerformanceModule
          data={data}
          manualFtp={200}
          customTicks={['bad-date', '2026-02-01']}
        />,
      ),
    ).not.toThrow();
  });
});
