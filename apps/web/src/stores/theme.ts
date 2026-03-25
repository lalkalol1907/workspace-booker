import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'booker_theme_mode';

function readSavedMode(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system');

  const effectiveMode = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') {
      return systemPrefersDark() ? 'dark' : 'light';
    }
    return mode.value;
  });

  function applyThemeClass() {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveMode.value === 'dark');
  }

  function setMode(next: ThemeMode) {
    mode.value = next;
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass();
  }

  function init() {
    mode.value = readSavedMode();
    applyThemeClass();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') {
        applyThemeClass();
      }
    });
  }

  return {
    mode,
    effectiveMode,
    setMode,
    init,
  };
});
