import { describe, it, expect } from 'vitest';
import { stravaRateLimitWaitMinutes, stravaHttpErrorMessage } from '../../utils/stravaHttp';

describe('stravaHttp', () => {
  it('parses Retry-After seconds into minutes', () => {
    const resp = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '120' },
    });
    expect(stravaRateLimitWaitMinutes(resp)).toBe(2);
  });

  it('returns default minutes when Retry-After missing', () => {
    const resp = new Response(null, { status: 429 });
    expect(stravaRateLimitWaitMinutes(resp)).toBe(15);
  });

  it('builds friendly 429 message', () => {
    const resp = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
    expect(stravaHttpErrorMessage(resp)).toContain('429');
    expect(stravaHttpErrorMessage(resp)).toContain('1');
  });
});
