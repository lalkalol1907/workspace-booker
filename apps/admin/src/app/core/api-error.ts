export function parseErrorCodeFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const o = body as Record<string, unknown>;
  if (typeof o['errorCode'] === 'string') {
    return o['errorCode'];
  }
  if (
    typeof o['message'] === 'object' &&
    o['message'] !== null &&
    !Array.isArray(o['message'])
  ) {
    const m = o['message'] as Record<string, unknown>;
    if (typeof m['errorCode'] === 'string') {
      return m['errorCode'];
    }
  }
  return null;
}
