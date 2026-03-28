import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from './theme';

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.removeItem('booker_theme_mode');
    document.documentElement.classList.remove('dark');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false } as Response),
    );
  });

  it('defaults to system mode', () => {
    const store = useThemeStore();
    expect(store.mode).toBe('system');
  });

  it('setMode persists to localStorage', () => {
    const store = useThemeStore();
    store.setMode('dark');
    expect(store.mode).toBe('dark');
    expect(localStorage.getItem('booker_theme_mode')).toBe('dark');
  });

  it('setMode("dark") adds dark class', () => {
    const store = useThemeStore();
    store.setMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setMode("light") removes dark class', () => {
    document.documentElement.classList.add('dark');
    const store = useThemeStore();
    store.setMode('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('effectiveMode returns light/dark for explicit modes', () => {
    const store = useThemeStore();
    store.setMode('light');
    expect(store.effectiveMode).toBe('light');
    store.setMode('dark');
    expect(store.effectiveMode).toBe('dark');
  });

  it('effectiveMode resolves system preference', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as any;

    const store = useThemeStore();
    store.setMode('system');
    expect(store.effectiveMode).toBe('dark');

    window.matchMedia = original;
  });

  it('init reads saved mode from localStorage', async () => {
    localStorage.setItem('booker_theme_mode', 'dark');
    const store = useThemeStore();
    await store.init();
    expect(store.mode).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
