import { describe, it, expect } from '@rstest/core';
import { normalizeOrganizationHostsInput } from './organization-hosts';

describe('normalizeOrganizationHostsInput', () => {
  it('lowercases and strips ports', () => {
    expect(normalizeOrganizationHostsInput(['Example.COM:3000'])).toEqual([
      'example.com',
    ]);
  });

  it('deduplicates hosts', () => {
    expect(
      normalizeOrganizationHostsInput(['foo.com', 'FOO.COM', 'foo.com']),
    ).toEqual(['foo.com']);
  });

  it('filters empty strings', () => {
    expect(normalizeOrganizationHostsInput(['', '  ', 'valid.com'])).toEqual([
      'valid.com',
    ]);
  });

  it('returns empty array for all-empty input', () => {
    expect(normalizeOrganizationHostsInput(['', ''])).toEqual([]);
  });

  it('preserves order of first occurrence', () => {
    expect(
      normalizeOrganizationHostsInput(['b.com', 'a.com', 'b.com']),
    ).toEqual(['b.com', 'a.com']);
  });
});
