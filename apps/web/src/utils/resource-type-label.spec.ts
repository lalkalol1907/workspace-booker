import { describe, it, expect } from 'vitest';
import { resourceTypeLabel, resourceTypeOptions } from './resource-type-label';

describe('resourceTypeLabel', () => {
  it('returns "Рабочее место" for desk', () => {
    expect(resourceTypeLabel('desk')).toBe('Рабочее место');
  });

  it('returns "Переговорка" for room', () => {
    expect(resourceTypeLabel('room')).toBe('Переговорка');
  });

  it('returns "Другое" for other', () => {
    expect(resourceTypeLabel('other')).toBe('Другое');
  });

  it('returns raw value for unknown type', () => {
    expect(resourceTypeLabel('unknown' as any)).toBe('unknown');
  });
});

describe('resourceTypeOptions', () => {
  it('contains three options', () => {
    expect(resourceTypeOptions).toHaveLength(3);
  });

  it('each option has label and value', () => {
    for (const opt of resourceTypeOptions) {
      expect(opt).toHaveProperty('label');
      expect(opt).toHaveProperty('value');
    }
  });
});
