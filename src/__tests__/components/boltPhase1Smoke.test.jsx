import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PerformanceModule from '../../components/PerformanceModule.jsx';
import Header from '../../components/Header.jsx';
import MainNav from '../../components/shell/MainNav.jsx';
import { ActivitiesProvider } from '../../context/ActivitiesContext.jsx';

vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
  ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
}));

const sampleActivities = [
  {
    id: '1',
    date: '2026-01-15',
    type: 'Ride',
    distance: 80,
    climbing: 900,
    moving_time: 10800,
    load: 65,
    ftp: 250,
    eFTP: 240,
    eFTP60: 230,
    avg_power: 180,
    title: 'Test ride',
  },
  {
    id: '2',
    date: '2026-02-01',
    type: 'VirtualRide',
    distance: 40,
    climbing: 400,
    moving_time: 5400,
    load: 45,
    ftp: 250,
    eFTP: 235,
    eFTP60: 225,
    avg_power: 170,
    title: 'Indoor',
  },
];

describe('Bolt Phase 1 smoke renders', () => {
  it('PerformanceModule renders with activity data', () => {
    expect(() =>
      render(<PerformanceModule data={sampleActivities} manualFtp={250} />),
    ).not.toThrow();
    expect(screen.getByText('Current FTP')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('PerformanceModule renders with empty data', () => {
    expect(() => render(<PerformanceModule data={[]} manualFtp={250} />)).not.toThrow();
    expect(screen.getByText('Current FTP')).toBeInTheDocument();
  });

  it('Header renders when signed out', () => {
    const userSettings = { privacyMode: false, weight: 75, ftp: 250 };
    expect(() =>
      render(
        <ActivitiesProvider user={null}>
          <Header
            userSettings={userSettings}
            onOpenSettings={() => {}}
            user={null}
            theme="light"
            setTheme={() => {}}
          />
        </ActivitiesProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText(/Climb/)).toBeInTheDocument();
  });

  it('MainNav renders', () => {
    expect(() =>
      render(
        <MainNav
          activeTab="dashboard"
          onTabChange={() => {}}
          timeRange="1Y"
          onTimeRangeChange={() => {}}
          customStart=""
          customEnd=""
          onCustomStart={() => {}}
          onCustomEnd={() => {}}
          isMobileMenuOpen={false}
          onMobileMenuOpenChange={() => {}}
        />,
      ),
    ).not.toThrow();
  });
});
