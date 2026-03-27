import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useMediaQuery, useIsMdUp } from './useMediaQuery';

function createMatchMediaMock(initialMatches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn(),
  };
  return {
    mql,
    listeners,
    mockFn: vi.fn().mockReturnValue(mql),
  };
}

describe('useMediaQuery', () => {
  it('returns initial match state', () => {
    const { mockFn } = createMatchMediaMock(true);
    const original = window.matchMedia;
    window.matchMedia = mockFn as any;

    const wrapper = mount(
      defineComponent({
        setup() {
          const matches = useMediaQuery('(min-width: 768px)');
          return { matches };
        },
        template: '<div>{{ matches }}</div>',
      }),
    );

    expect(wrapper.vm.matches).toBe(true);
    window.matchMedia = original;
  });

  it('reacts to media query changes', async () => {
    const { mockFn, mql, listeners } = createMatchMediaMock(false);
    const original = window.matchMedia;
    window.matchMedia = mockFn as any;

    const wrapper = mount(
      defineComponent({
        setup() {
          const matches = useMediaQuery('(min-width: 768px)');
          return { matches };
        },
        template: '<div>{{ matches }}</div>',
      }),
    );

    expect(wrapper.vm.matches).toBe(false);

    mql.matches = true;
    listeners.forEach((cb) => cb());
    await nextTick();

    expect(wrapper.vm.matches).toBe(true);
    window.matchMedia = original;
  });
});

describe('useIsMdUp', () => {
  it('uses 768px breakpoint', () => {
    const mockFn = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const original = window.matchMedia;
    window.matchMedia = mockFn as any;

    mount(
      defineComponent({
        setup() {
          const matches = useIsMdUp();
          return { matches };
        },
        template: '<div/>',
      }),
    );

    expect(mockFn).toHaveBeenCalledWith('(min-width: 768px)');
    window.matchMedia = original;
  });
});
