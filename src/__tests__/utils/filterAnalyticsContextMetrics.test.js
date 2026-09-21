import { describe, it, expect } from 'vitest';
import {
    detectFilterAnalyticsContext,
    resolveEffectiveMetricKeys,
    FILTER_ANALYTICS_CONTEXT_PROFILES,
} from '../../utils/filterAnalyticsContextMetrics';
import { metricKeysForPreset } from '../../utils/filterAnalyticsMetrics';

describe('filterAnalyticsContextMetrics', () => {
    it('detectFilterAnalyticsContext returns long_ride profile', () => {
        const profile = detectFilterAnalyticsContext({ longRideOnly: true });
        expect(profile?.id).toBe('long_ride');
        expect(profile?.keys).toContain('distance_avg');
        expect(profile?.keys).toContain('time_avg');
    });

    it('detectFilterAnalyticsContext prioritizes single activity over long ride', () => {
        const profile = detectFilterAnalyticsContext({
            isolateActivityId: 'abc',
            longRideOnly: true,
        });
        expect(profile?.id).toBe('single_activity');
    });

    it('detectFilterAnalyticsContext returns climb_focus when elevation range is set', () => {
        const profile = detectFilterAnalyticsContext({
            metricRangeActive: true,
            filterElevMin: 500,
        });
        expect(profile?.id).toBe('climb_focus');
    });

    it('detectFilterAnalyticsContext returns with_power profile', () => {
        const profile = detectFilterAnalyticsContext({ withPowerOnly: true });
        expect(profile?.id).toBe('with_power');
        expect(profile?.keys).toContain('avg_np');
    });

    it('resolveEffectiveMetricKeys uses full context profile on essential preset', () => {
        const stored = metricKeysForPreset('essential');
        const effective = resolveEffectiveMetricKeys({
            storedKeys: stored,
            activePreset: 'essential',
            contextProfile: FILTER_ANALYTICS_CONTEXT_PROFILES.long_ride,
            manualOverride: false,
        });
        expect(effective).toContain('distance_avg');
        expect(effective).toContain('time_avg');
        expect(effective).not.toEqual(stored);
    });

    it('resolveEffectiveMetricKeys merges context extras for non-essential presets', () => {
        const stored = metricKeysForPreset('intensity');
        const effective = resolveEffectiveMetricKeys({
            storedKeys: stored,
            activePreset: 'intensity',
            contextProfile: FILTER_ANALYTICS_CONTEXT_PROFILES.long_ride,
            manualOverride: false,
        });
        expect(effective).toContain('avg_np');
        expect(effective).toContain('distance_avg');
        expect(effective).toContain('time_avg');
    });

    it('resolveEffectiveMetricKeys respects manual override', () => {
        const stored = metricKeysForPreset('essential');
        const effective = resolveEffectiveMetricKeys({
            storedKeys: stored,
            activePreset: 'essential',
            contextProfile: FILTER_ANALYTICS_CONTEXT_PROFILES.long_ride,
            manualOverride: true,
        });
        expect(effective).toEqual(stored);
        expect(effective).not.toContain('distance_avg');
    });
});
