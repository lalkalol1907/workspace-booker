import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationHost } from '../entities/organization-host.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { TenantBrandingModule } from '../tenant-branding/tenant-branding.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationHost, User]),
    TenantBrandingModule,
    NotificationsModule,
  ],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
