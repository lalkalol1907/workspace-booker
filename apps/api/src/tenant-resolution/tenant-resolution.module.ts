import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationHost } from '../entities/organization-host.entity';
import { TenantResolutionService } from './tenant-resolution.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationHost])],
  providers: [TenantResolutionService],
  exports: [TenantResolutionService],
})
export class TenantResolutionModule {}
