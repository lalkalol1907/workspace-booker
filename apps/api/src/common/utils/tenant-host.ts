import type { FastifyRequest } from 'fastify';

/** Hostname only, lowercased (no port). */
export function normalizeTenantHost(host: string): string {
  const first = host.split(',')[0]?.trim() ?? '';
  return first.split(':')[0]?.toLowerCase() ?? '';
}

/**
 * Tenant hostname from the incoming request (reverse-proxy aware).
 */
export function hostFromRequest(req: FastifyRequest): string {
  const xf = req.headers['x-forwarded-host'];
  if (typeof xf === 'string' && xf.length > 0) {
    return normalizeTenantHost(xf);
  }
  const host = req.headers.host;
  if (typeof host === 'string' && host.length > 0) {
    return normalizeTenantHost(host);
  }
  return '';
}
