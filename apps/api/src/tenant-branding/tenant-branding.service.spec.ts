import { describe, it, expect, rstest } from '@rstest/core';

rstest.mock('../entities/organization.entity', () => ({
  Organization: class {},
}));

import { NotFoundException } from '@nestjs/common';
import { TenantBrandingService } from './tenant-branding.service';

describe('TenantBrandingService', () => {
  it('getForPlatformOrEmpty throws when org missing', async () => {
    const orgRepo = { exist: rstest.fn().mockResolvedValue(false) };
    const brandingModel = {};
    const service = new TenantBrandingService(
      brandingModel as any,
      orgRepo as any,
    );
    await expect(service.getForPlatformOrEmpty('00000000-0000-0000-0000-000000000001')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upsert throws when org missing', async () => {
    const orgRepo = { exist: rstest.fn().mockResolvedValue(false) };
    const brandingModel = {};
    const service = new TenantBrandingService(
      brandingModel as any,
      orgRepo as any,
    );
    await expect(
      service.upsert('00000000-0000-0000-0000-000000000001', {
        light: { primary: '230 90% 64%' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
