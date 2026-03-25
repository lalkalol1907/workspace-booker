import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { normalizeTenantHost } from '../common/utils/tenant-host';
import { OrganizationHost } from '../entities/organization-host.entity';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OrganizationHost)
    private readonly orgHostRepo: Repository<OrganizationHost>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async resolveTenantFromHost(
    requestHost: string,
  ): Promise<Organization | null> {
    const host = normalizeTenantHost(requestHost);
    const fallback = this.config.get<string>('DEFAULT_TENANT_HOST');
    const candidates: string[] = [];
    if (host) {
      candidates.push(host);
    }
    if (
      (host === '127.0.0.1' || host === '::1') &&
      !candidates.includes('localhost')
    ) {
      candidates.push('localhost');
    }
    if (fallback) {
      const fb = normalizeTenantHost(fallback);
      if (fb && !candidates.includes(fb)) {
        candidates.push(fb);
      }
    }
    for (const h of candidates) {
      const link = await this.orgHostRepo.findOne({
        where: { host: h },
        relations: ['organization'],
      });
      if (link?.organization) {
        return link.organization;
      }
    }
    return null;
  }

  async login(dto: LoginDto, requestHost: string): Promise<TokenResponseDto> {
    const org = await this.resolveTenantFromHost(requestHost);
    if (!org) {
      throw new UnauthorizedException();
    }
    const email = dto.email.toLowerCase();
    let user = await this.userRepo.findOne({
      where: { organizationId: org.id, email },
    });
    if (!user) {
      // Platform admins can sign in from any tenant domain.
      user = await this.userRepo.findOne({
        where: { email, role: UserRole.SUPER_ADMIN },
      });
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(user);
  }

  async platformLogin(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase(), role: UserRole.SUPER_ADMIN },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(user);
  }

  async me(payload: JwtPayload): Promise<MeResponseDto> {
    let user: User | null;
    if (payload.role === UserRole.SUPER_ADMIN) {
      user = await this.userRepo.findOne({
        where: { id: payload.sub },
        relations: ['organization'],
      });
    } else {
      if (!payload.organizationId) {
        throw new UnauthorizedException();
      }
      user = await this.userRepo.findOne({
        where: { id: payload.sub, organizationId: payload.organizationId },
        relations: ['organization'],
      });
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      organizationName: user.organization?.name ?? null,
    };
  }

  async changePassword(
    payload: JwtPayload,
    dto: ChangePasswordDto,
  ): Promise<void> {
    let user: User | null;
    if (payload.role === UserRole.SUPER_ADMIN) {
      user = await this.userRepo.findOne({ where: { id: payload.sub } });
    } else {
      if (!payload.organizationId) {
        throw new UnauthorizedException();
      }
      user = await this.userRepo.findOne({
        where: { id: payload.sub, organizationId: payload.organizationId },
      });
    }
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException();
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException();
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepo.save(user);
  }

  private issueTokens(user: User): TokenResponseDto {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      /** Super admins always get null here so JWT matches JwtStrategy (home org may stay in DB). */
      organizationId:
        user.role === UserRole.SUPER_ADMIN
          ? null
          : (user.organizationId ?? null),
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(jwtPayload),
    };
  }
}
