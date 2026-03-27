import { describe, it, expect } from '@rstest/core';
import { normalizeTenantHost, hostFromRequest } from './tenant-host';

describe('normalizeTenantHost', () => {
  it('lowercases and strips port', () => {
    expect(normalizeTenantHost('Example.COM:3000')).toBe('example.com');
  });

  it('takes the first comma-separated value', () => {
    expect(normalizeTenantHost('first.com, second.com')).toBe('first.com');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeTenantHost('')).toBe('');
  });

  it('handles plain hostname', () => {
    expect(normalizeTenantHost('myhost')).toBe('myhost');
  });
});

describe('hostFromRequest', () => {
  const fakeRequest = (headers: Record<string, string | undefined>) =>
    ({ headers }) as any;

  it('prefers X-Forwarded-Host over Host', () => {
    const req = fakeRequest({
      'x-forwarded-host': 'proxy.example.com',
      host: 'original.example.com',
    });
    expect(hostFromRequest(req)).toBe('proxy.example.com');
  });

  it('falls back to Host header', () => {
    const req = fakeRequest({ host: 'direct.example.com:8080' });
    expect(hostFromRequest(req)).toBe('direct.example.com');
  });

  it('returns empty string when no headers', () => {
    const req = fakeRequest({});
    expect(hostFromRequest(req)).toBe('');
  });
});
