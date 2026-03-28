import { Controller, Get, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { hostFromRequest } from '../common/utils/tenant-host';
import { TenantResolutionService } from '../tenant-resolution/tenant-resolution.service';
import { PublicTenantBrandingWrapperDto } from '../tenant-branding/dto/tenant-branding-response.dto';
import { TenantBrandingService } from '../tenant-branding/tenant-branding.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly tenantResolution: TenantResolutionService,
    private readonly branding: TenantBrandingService,
  ) {}

  @Get('tenant-branding')
  @ApiOperation({ summary: 'Tenant theme tokens by Host (no auth)' })
  @ApiOkResponse({ type: PublicTenantBrandingWrapperDto })
  async getTenantBranding(
    @Req() req: FastifyRequest,
  ): Promise<PublicTenantBrandingWrapperDto> {
    const host = hostFromRequest(req);
    const org = await this.tenantResolution.resolveOrganizationFromHost(host);
    if (!org) {
      return { organizationId: null, light: null, dark: null };
    }
    const doc = await this.branding.findByOrganizationId(org.id);
    return {
      organizationId: org.id,
      light: doc?.light && Object.keys(doc.light).length > 0 ? doc.light : null,
      dark: doc?.dark && Object.keys(doc.dark).length > 0 ? doc.dark : null,
    };
  }
}
