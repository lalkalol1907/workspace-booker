import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeTenantHost } from '../common/utils/tenant-host';
import { OrganizationHost } from '../entities/organization-host.entity';
import type { Organization } from '../entities/organization.entity';

@Injectable()
export class TenantResolutionService {
  constructor(
    @InjectRepository(OrganizationHost)
    private readonly orgHostRepo: Repository<OrganizationHost>,
    private readonly config: ConfigService,
  ) {}

  async resolveOrganizationFromHost(
    requestHost: string,
  ): Promise<Organization | null> {
    const host = normalizeTenantHost(requestHost);
    const fallback = this.config.get<string>('DEFAULT_TENANT_HOST');
    const candidates: string[] = [];
    if (host) {
      candidates.push(host);
    }
    if (
      (host === '127.0.0.1' || host === '::1') &&
      !candidates.includes('localhost')
    ) {
      candidates.push('localhost');
    }
    if (fallback) {
      const fb = normalizeTenantHost(fallback);
      if (fb && !candidates.includes(fb)) {
        candidates.push(fb);
      }
    }
    for (const h of candidates) {
      const link = await this.orgHostRepo.findOne({
        where: { host: h },
        relations: ['organization'],
      });
      if (link?.organization) {
        return link.organization;
      }
    }
    return null;
  }
}
