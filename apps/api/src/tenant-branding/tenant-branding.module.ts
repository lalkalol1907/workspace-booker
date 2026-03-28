import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../entities/organization.entity';
import {
  TenantBranding,
  TenantBrandingSchema,
} from './schemas/tenant-branding.schema';
import { TenantBrandingService } from './tenant-branding.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TenantBranding.name, schema: TenantBrandingSchema },
    ]),
    TypeOrmModule.forFeature([Organization]),
  ],
  providers: [TenantBrandingService],
  exports: [TenantBrandingService],
})
export class TenantBrandingModule {}
