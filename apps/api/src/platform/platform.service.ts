import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeTenantHost } from '../common/utils/tenant-host';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { CreatePlatformOrganizationDto } from './dto/create-platform-organization.dto';
import { OrganizationSummaryDto } from './dto/organization-summary.dto';
import { UpdatePlatformOrganizationDto } from './dto/update-platform-organization.dto';
import { UpdatePlatformUserRoleDto } from './dto/update-platform-user-role.dto';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listOrganizations(): Promise<OrganizationSummaryDto[]> {
    const rows = await this.orgRepo.find({ order: { name: 'ASC' } });
    return rows.map((o) => this.toSummary(o));
  }

  async createOrganization(
    dto: CreatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    const host = normalizeTenantHost(dto.host) || dto.host.trim().toLowerCase();
    const slug = dto.slug.toLowerCase();
    const slugTaken = await this.orgRepo.exist({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException('Slug already in use');
    }
    const hostTaken = await this.orgRepo.exist({ where: { host } });
    if (hostTaken) {
      throw new ConflictException('Host already in use');
    }
    const org = this.orgRepo.create({
      name: dto.name.trim(),
      slug,
      host,
    });
    await this.orgRepo.save(org);
    return this.toSummary(org);
  }

  async updateOrganization(
    id: string,
    dto: UpdatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException();
    }
    const host = normalizeTenantHost(dto.host) || dto.host.trim().toLowerCase();
    const slug = dto.slug.toLowerCase();
    const otherSlug = await this.orgRepo.findOne({ where: { slug } });
    if (otherSlug && otherSlug.id !== id) {
      throw new ConflictException('Slug already in use');
    }
    const otherHost = await this.orgRepo.findOne({ where: { host } });
    if (otherHost && otherHost.id !== id) {
      throw new ConflictException('Host already in use');
    }
    org.name = dto.name.trim();
    org.slug = slug;
    org.host = host;
    await this.orgRepo.save(org);
    return this.toSummary(org);
  }

  async updateUserRole(
    organizationId: string,
    userId: string,
    dto: UpdatePlatformUserRoleDto,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException();
    }
    user.role = dto.role;
    await this.userRepo.save(user);
  }

  private toSummary(o: Organization): OrganizationSummaryDto {
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      host: o.host,
      createdAt: o.createdAt,
    };
  }
}
