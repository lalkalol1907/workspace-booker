import { Module } from '@nestjs/common';
import { TenantBrandingModule } from '../tenant-branding/tenant-branding.module';
import { TenantResolutionModule } from '../tenant-resolution/tenant-resolution.module';
import { PublicController } from './public.controller';

@Module({
  imports: [TenantResolutionModule, TenantBrandingModule],
  controllers: [PublicController],
})
export class PublicModule {}
