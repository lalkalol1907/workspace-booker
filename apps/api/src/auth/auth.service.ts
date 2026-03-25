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
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, requestHost: string): Promise<TokenResponseDto> {
    const host = normalizeTenantHost(requestHost);
    const fallback = this.config.get<string>('DEFAULT_TENANT_HOST');
    let org = host ? await this.orgRepo.findOne({ where: { host } }) : null;
    if (!org && (host === '127.0.0.1' || host === '::1')) {
      org = await this.orgRepo.findOne({ where: { host: 'localhost' } });
    }
    if (!org && fallback) {
      org = await this.orgRepo.findOne({
        where: { host: normalizeTenantHost(fallback) },
      });
    }
    if (!org) {
      throw new UnauthorizedException();
    }
    const user = await this.userRepo.findOne({
      where: { organizationId: org.id, email: dto.email.toLowerCase() },
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
