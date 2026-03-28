import { computed, ref, watch } from 'vue';
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

/** camelCase → --kebab-case (primaryForeground → --primary-foreground) */
function tokenToCssVar(key: string): string {
  return '--' + key.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
}

/** H S% L% без обёртки hsl(), как в style.css */
function deriveAccentFromPrimary(
  primary: string,
  mode: 'light' | 'dark',
): { accent: string; accentForeground: string } | null {
  const m = primary
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) {
    return null;
  }
  const h = Number(m[1]);
  if (mode === 'light') {
    return {
      accent: `${h} 42% 93%`,
      accentForeground: `${h} 48% 32%`,
    };
  }
  return {
    accent: `${h} 28% 22%`,
    accentForeground: `${h} 86% 88%`,
  };
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system');
  const tenantLight = ref<Record<string, string> | null>(null);
  const tenantDark = ref<Record<string, string> | null>(null);
  const lastAppliedKeys = ref<string[]>([]);

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

  function clearTenantInlineVars() {
    const root = document.documentElement;
    for (const k of lastAppliedKeys.value) {
      root.style.removeProperty(tokenToCssVar(k));
    }
    lastAppliedKeys.value = [];
  }

  function applyTenantCssVariables() {
    const root = document.documentElement;
    const tokens =
      effectiveMode.value === 'dark' ? tenantDark.value : tenantLight.value;
    clearTenantInlineVars();
    if (!tokens || Object.keys(tokens).length === 0) {
      return;
    }
    const keys: string[] = [];
    for (const [k, v] of Object.entries(tokens)) {
      if (v && v.trim()) {
        root.style.setProperty(tokenToCssVar(k), v.trim());
        keys.push(k);
      }
    }
    const primary = tokens.primary?.trim();
    if (primary) {
      if (!tokens.ring?.trim()) {
        root.style.setProperty('--ring', primary);
        keys.push('ring');
      }
      if (!tokens.accent?.trim()) {
        const pair = deriveAccentFromPrimary(primary, effectiveMode.value);
        if (pair) {
          root.style.setProperty('--accent', pair.accent);
          root.style.setProperty('--accent-foreground', pair.accentForeground);
          keys.push('accent', 'accentForeground');
        }
      }
    }
    lastAppliedKeys.value = keys;
  }

  function syncTheme() {
    applyThemeClass();
    applyTenantCssVariables();
  }

  async function loadTenantBranding(): Promise<void> {
    try {
      const res = await fetch('/api/public/tenant-branding');
      if (!res.ok) {
        tenantLight.value = null;
        tenantDark.value = null;
        return;
      }
      const data = (await res.json()) as {
        organizationId: string | null;
        light: Record<string, string> | null;
        dark: Record<string, string> | null;
      };
      tenantLight.value = data.light;
      tenantDark.value = data.dark;
    } catch {
      tenantLight.value = null;
      tenantDark.value = null;
    }
  }

  function setMode(next: ThemeMode) {
    mode.value = next;
    localStorage.setItem(STORAGE_KEY, next);
    // Not only when effectiveMode changes: e.g. system (dark) → explicit dark must still apply .dark
    syncTheme();
  }

  watch(effectiveMode, () => {
    syncTheme();
  });

  async function init() {
    mode.value = readSavedMode();
    syncTheme();
    await loadTenantBranding();
    syncTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') {
        syncTheme();
      }
    });
  }

  return {
    mode,
    effectiveMode,
    tenantLight,
    tenantDark,
    setMode,
    init,
    loadTenantBranding,
  };
});
