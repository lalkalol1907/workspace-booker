import { describe, it, expect } from 'vitest';
import { userInitialsFromDisplayName } from './user-initials';

describe('userInitialsFromDisplayName', () => {
  it('returns two-letter initials for two-word name', () => {
    expect(userInitialsFromDisplayName('Иван Петров')).toBe('ИП');
  });

  it('takes first and last parts for multi-word name', () => {
    expect(userInitialsFromDisplayName('Анна Мария Иванова')).toBe('АИ');
  });

  it('returns first two characters for single-word name', () => {
    expect(userInitialsFromDisplayName('Админ')).toBe('АД');
  });

  it('uppercases the result', () => {
    expect(userInitialsFromDisplayName('john doe')).toBe('JD');
  });

  it('returns "?" for undefined', () => {
    expect(userInitialsFromDisplayName(undefined)).toBe('?');
  });

  it('returns "?" for null', () => {
    expect(userInitialsFromDisplayName(null)).toBe('?');
  });

  it('returns "?" for empty string', () => {
    expect(userInitialsFromDisplayName('')).toBe('?');
  });

  it('returns "?" for whitespace-only string', () => {
    expect(userInitialsFromDisplayName('   ')).toBe('?');
  });

  it('trims leading/trailing whitespace', () => {
    expect(userInitialsFromDisplayName('  Иван Петров  ')).toBe('ИП');
  });
});
