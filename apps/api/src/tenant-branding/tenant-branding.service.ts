import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import type { ThemeTokensDto } from './dto/theme-tokens.dto';
import type { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import type { TenantBrandingResponseDto } from './dto/tenant-branding-response.dto';
import {
  TenantBranding,
  type TenantBrandingDocument,
} from './schemas/tenant-branding.schema';

function stripThemeTokens(
  dto: ThemeTokensDto | Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (typeof v === 'string' && v.trim() !== '') {
      out[k] = v.trim();
    }
  }
  return out;
}

@Injectable()
export class TenantBrandingService {
  constructor(
    @InjectModel(TenantBranding.name)
    private readonly brandingModel: Model<TenantBrandingDocument>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /** Для платформенной админки: 404 если организации нет в PostgreSQL. */
  async getForPlatformOrEmpty(
    organizationId: string,
  ): Promise<TenantBrandingResponseDto> {
    const exists = await this.orgRepo.exist({ where: { id: organizationId } });
    if (!exists) {
      throw new NotFoundException();
    }
    const doc = await this.findByOrganizationId(organizationId);
    return doc ?? { organizationId, light: {}, dark: {} };
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<TenantBrandingResponseDto | null> {
    const doc = await this.brandingModel
      .findOne({ organizationId })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    return {
      organizationId: doc.organizationId,
      light: { ...doc.light },
      dark: { ...doc.dark },
    };
  }

  async upsert(
    organizationId: string,
    dto: UpdateTenantBrandingDto,
  ): Promise<TenantBrandingResponseDto> {
    const exists = await this.orgRepo.exist({ where: { id: organizationId } });
    if (!exists) {
      throw new NotFoundException();
    }

    const existing = await this.brandingModel
      .findOne({ organizationId })
      .exec();

    let nextLight: Record<string, string> = {
      ...(existing?.light ? existing.light : {}),
    };
    let nextDark: Record<string, string> = {
      ...(existing?.dark ? existing.dark : {}),
    };

    if (dto.light !== undefined) {
      nextLight = {
        ...nextLight,
        ...stripThemeTokens(dto.light),
      };
    }
    if (dto.dark !== undefined) {
      nextDark = {
        ...nextDark,
        ...stripThemeTokens(dto.dark),
      };
    }

    if (dto.light === undefined && dto.dark === undefined) {
      const cur = await this.findByOrganizationId(organizationId);
      if (cur) {
        return cur;
      }
      return { organizationId, light: {}, dark: {} };
    }

    const doc = await this.brandingModel.findOneAndUpdate(
      { organizationId },
      {
        $set: {
          organizationId,
          light: nextLight,
          dark: nextDark,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (!doc) {
      throw new NotFoundException();
    }

    return {
      organizationId: doc.organizationId,
      light: { ...doc.light },
      dark: { ...doc.dark },
    };
  }
}
