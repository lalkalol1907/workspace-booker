import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AppException } from '../common/exceptions/app.exception';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User } from '../entities/user.entity';
import { TenantResolutionService } from '../tenant-resolution/tenant-resolution.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenantResolution: TenantResolutionService,
  ) {}

  async login(dto: LoginDto, requestHost: string): Promise<TokenResponseDto> {
    const org =
      await this.tenantResolution.resolveOrganizationFromHost(requestHost);
    if (!org) {
      throw new AppException(ErrorCode.TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const email = dto.email.toLowerCase();
    const tenantUser = await this.userRepo.findOne({
      where: { organizationId: org.id, email },
    });
    const superAdminUser = await this.userRepo.findOne({
      where: { email, role: UserRole.SUPER_ADMIN },
    });

    let user: User | null = null;
    if (tenantUser) {
      const okTenant = await bcrypt.compare(
        dto.password,
        tenantUser.passwordHash,
      );
      if (okTenant) {
        user = tenantUser;
      }
    }
    if (!user && superAdminUser) {
      // Platform admins can sign in from any tenant domain.
      const okSuperAdmin = await bcrypt.compare(
        dto.password,
        superAdminUser.passwordHash,
      );
      if (okSuperAdmin) {
        user = superAdminUser;
      }
    }
    if (!user) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.issueTokens(user);
  }

  async platformLogin(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase(), role: UserRole.SUPER_ADMIN },
    });
    if (!user) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
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
      throw new AppException(
        ErrorCode.INCORRECT_CURRENT_PASSWORD,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new AppException(ErrorCode.SAME_PASSWORD, HttpStatus.BAD_REQUEST);
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    user.tokenVersion += 1;
    await this.userRepo.save(user);
  }

  private issueTokens(user: User): TokenResponseDto {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      organizationId:
        user.role === UserRole.SUPER_ADMIN
          ? null
          : (user.organizationId ?? null),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    return {
      accessToken: this.jwt.sign(jwtPayload),
    };
  }
}
