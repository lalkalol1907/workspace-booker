import { normalizeTenantHost } from './tenant-host';

/** Нормализует список доменов: trim, lower case через normalizeTenantHost, без дубликатов. */
export function normalizeOrganizationHostsInput(hosts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of hosts) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) {
      continue;
    }
    const h =
      normalizeTenantHost(trimmed) || trimmed.toLowerCase().replace(/:\d+$/, '');
    if (!h || seen.has(h)) {
      continue;
    }
    seen.add(h);
    out.push(h);
  }
  return out;
}
