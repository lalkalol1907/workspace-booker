import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeOrganizationHostsInput } from '../common/utils/organization-hosts';
import { OrganizationHost } from '../entities/organization-host.entity';
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
    @InjectRepository(OrganizationHost)
    private readonly orgHostRepo: Repository<OrganizationHost>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listOrganizations(): Promise<OrganizationSummaryDto[]> {
    const rows = await this.orgRepo.find({
      order: { name: 'ASC' },
      relations: ['hosts'],
    });
    return rows.map((o) => this.toSummary(o));
  }

  async createOrganization(
    dto: CreatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    const hosts = normalizeOrganizationHostsInput(dto.hosts);
    if (hosts.length === 0) {
      throw new BadRequestException('At least one valid host is required');
    }
    const slug = dto.slug.toLowerCase();
    const slugTaken = await this.orgRepo.exist({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException('Slug already in use');
    }
    for (const h of hosts) {
      const taken = await this.orgHostRepo.exist({ where: { host: h } });
      if (taken) {
        throw new ConflictException(`Host already in use: ${h}`);
      }
    }
    const org = this.orgRepo.create({
      name: dto.name.trim(),
      slug,
    });
    await this.orgRepo.save(org);
    for (const h of hosts) {
      await this.orgHostRepo.save(
        this.orgHostRepo.create({ organizationId: org.id, host: h }),
      );
    }
    const created = await this.orgRepo.findOneOrFail({
      where: { id: org.id },
      relations: ['hosts'],
    });
    return this.toSummary(created);
  }

  async updateOrganization(
    id: string,
    dto: UpdatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException();
    }
    const hosts = normalizeOrganizationHostsInput(dto.hosts);
    if (hosts.length === 0) {
      throw new BadRequestException('At least one valid host is required');
    }
    const slug = dto.slug.toLowerCase();
    const otherSlug = await this.orgRepo.findOne({ where: { slug } });
    if (otherSlug && otherSlug.id !== id) {
      throw new ConflictException('Slug already in use');
    }
    for (const h of hosts) {
      const row = await this.orgHostRepo.findOne({ where: { host: h } });
      if (row && row.organizationId !== id) {
        throw new ConflictException(`Host already in use: ${h}`);
      }
    }
    org.name = dto.name.trim();
    org.slug = slug;
    await this.orgRepo.save(org);
    await this.orgHostRepo.delete({ organizationId: id });
    for (const h of hosts) {
      await this.orgHostRepo.save(
        this.orgHostRepo.create({ organizationId: id, host: h }),
      );
    }
    const updated = await this.orgRepo.findOneOrFail({
      where: { id },
      relations: ['hosts'],
    });
    return this.toSummary(updated);
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
    const hostList = (o.hosts ?? [])
      .map((h) => h.host)
      .sort((a, b) => a.localeCompare(b));
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      hosts: hostList,
      createdAt: o.createdAt,
    };
  }
}
