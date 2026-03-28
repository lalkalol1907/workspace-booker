import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import { normalizeOrganizationHostsInput } from '../common/utils/organization-hosts';
import { OrganizationHost } from '../entities/organization-host.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { CreatePlatformOrganizationDto } from './dto/create-platform-organization.dto';
import { PlatformAdminSummaryDto } from './dto/platform-admin-summary.dto';
import { PlatformAdminUpsertResultDto } from './dto/platform-admin-upsert-result.dto';
import { OrganizationSummaryDto } from './dto/organization-summary.dto';
import { UpsertPlatformAdminDto } from './dto/upsert-platform-admin.dto';
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
    private readonly config: ConfigService,
  ) {}

  private normalizeEnvHost(raw: string): string {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
      return '';
    }
    if (trimmed.includes('://')) {
      try {
        return new URL(trimmed).hostname.trim().toLowerCase();
      } catch {
        // fallback to generic parsing below
      }
    }
    return trimmed.split('/')[0]?.replace(/:\d+$/, '') ?? '';
  }

  private getReservedPlatformHosts(): string[] {
    const raw = [
      this.config.get<string>('PLATFORM_HOST') ?? '',
      this.config.get<string>('PLATFORM_URL') ?? '',
    ];
    const unique = new Set<string>();
    for (const v of raw) {
      const n = this.normalizeEnvHost(v);
      if (n) {
        unique.add(n);
      }
    }
    return [...unique];
  }

  private assertHostsNotReserved(hosts: string[]): void {
    const reserved = this.getReservedPlatformHosts();
    if (reserved.length === 0) {
      return;
    }
    const conflict = hosts.find((h) => reserved.includes(h));
    if (conflict) {
      throw new AppException(
        ErrorCode.HOST_RESERVED,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private generateTemporaryPassword(): string {
    return randomBytes(12).toString('base64url').slice(0, 16);
  }

  async listPlatformAdmins(): Promise<PlatformAdminSummaryDto[]> {
    const rows = await this.userRepo.find({
      where: { role: UserRole.SUPER_ADMIN },
      order: { email: 'ASC' },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
    }));
  }

  async upsertPlatformAdmin(
    dto: UpsertPlatformAdminDto,
  ): Promise<PlatformAdminUpsertResultDto> {
    const email = dto.email.trim().toLowerCase();
    const rows = await this.userRepo.find({ where: { email } });
    if (rows.length > 1) {
      throw new AppException(
        ErrorCode.PLATFORM_ADMIN_EMAIL_AMBIGUOUS,
        HttpStatus.CONFLICT,
      );
    }
    const existing = rows[0] ?? null;
    if (!existing) {
      const tempPlain = this.generateTemporaryPassword();
      const user = this.userRepo.create({
        organizationId: null,
        email,
        passwordHash: await bcrypt.hash(tempPlain, 10),
        displayName: dto.displayName?.trim() || email.split('@')[0] || email,
        role: UserRole.SUPER_ADMIN,
        mustChangePassword: true,
      });
      await this.userRepo.save(user);
      return {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        action: 'created',
        temporaryPassword: tempPlain,
      };
    }
    if (existing.role === UserRole.SUPER_ADMIN) {
      return {
        userId: existing.id,
        email: existing.email,
        displayName: existing.displayName,
        action: 'already_super_admin',
        temporaryPassword: null,
      };
    }
    existing.role = UserRole.SUPER_ADMIN;
    await this.userRepo.save(existing);
    return {
      userId: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      action: 'promoted',
      temporaryPassword: null,
    };
  }

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
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertHostsNotReserved(hosts);
    const slug = dto.slug.toLowerCase();
    const slugTaken = await this.orgRepo.exist({ where: { slug } });
    if (slugTaken) {
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT);
    }
    for (const h of hosts) {
      const taken = await this.orgHostRepo.exist({ where: { host: h } });
      if (taken) {
        throw new AppException(ErrorCode.HOST_TAKEN, HttpStatus.CONFLICT);
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
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertHostsNotReserved(hosts);
    const slug = dto.slug.toLowerCase();
    const otherSlug = await this.orgRepo.findOne({ where: { slug } });
    if (otherSlug && otherSlug.id !== id) {
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT);
    }
    for (const h of hosts) {
      const row = await this.orgHostRepo.findOne({ where: { host: h } });
      if (row && row.organizationId !== id) {
        throw new AppException(ErrorCode.HOST_TAKEN, HttpStatus.CONFLICT);
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
