let getExtraHeaders: () => Record<string, string> = () => ({});

export function setTenantHeadersProvider(fn: () => Record<string, string>): void {
  getExtraHeaders = fn;
}

export function getTenantHeaders(): Record<string, string> {
  try {
    return getExtraHeaders();
  } catch {
    return {};
  }
}
