import { describe, it, expect, beforeEach } from 'vitest';
import { getTenantHeaders, setTenantHeadersProvider } from './tenant-headers';

describe('tenant-headers', () => {
  beforeEach(() => {
    setTenantHeadersProvider(() => ({}));
  });

  it('returns empty object by default', () => {
    expect(getTenantHeaders()).toEqual({});
  });

  it('returns headers from custom provider', () => {
    setTenantHeadersProvider(() => ({ 'X-Org-Id': 'org-1' }));
    expect(getTenantHeaders()).toEqual({ 'X-Org-Id': 'org-1' });
  });

  it('returns empty object when provider throws', () => {
    setTenantHeadersProvider(() => {
      throw new Error('boom');
    });
    expect(getTenantHeaders()).toEqual({});
  });
});
