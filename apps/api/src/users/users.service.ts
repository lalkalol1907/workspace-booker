import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User } from '../entities/user.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import type { InviteUserResponseDto } from './dto/invite-user-response.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserSummaryDto } from './dto/user-summary.dto';

function generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64url').slice(0, 16);
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async list(organizationId: string): Promise<UserSummaryDto[]> {
    const rows = await this.userRepo.find({
      where: { organizationId },
      order: { email: 'ASC' },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
    }));
  }

  async remove(
    admin: JwtPayload,
    organizationId: string,
    id: string,
  ): Promise<void> {
    const target = await this.userRepo.findOne({
      where: { id, organizationId },
    });
    if (!target) {
      throw new NotFoundException();
    }
    if (target.id === admin.sub) {
      throw new ForbiddenException();
    }
    if (target.role === UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    await this.userRepo.remove(target);
  }

  async invite(
    admin: JwtPayload,
    organizationId: string,
    dto: InviteUserDto,
  ): Promise<InviteUserResponseDto> {
    const email = dto.email.toLowerCase();
    const exists = await this.userRepo.exist({
      where: { organizationId, email },
    });
    if (exists) {
      throw new ConflictException();
    }
    const tempPlain = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPlain, 10);
    const displayName = dto.displayName?.trim() || email.split('@')[0] || email;
    const user = this.userRepo.create({
      organizationId,
      email,
      passwordHash,
      displayName,
      role: UserRole.MEMBER,
      mustChangePassword: true,
    });
    await this.userRepo.save(user);
    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      temporaryPassword: tempPlain,
    };
  }

  async resetPassword(
    admin: JwtPayload,
    organizationId: string,
    userId: string,
  ): Promise<InviteUserResponseDto> {
    const target = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!target) {
      throw new NotFoundException();
    }
    if (target.id === admin.sub) {
      throw new ForbiddenException();
    }
    if (target.role === UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const tempPlain = generateTemporaryPassword();
    target.passwordHash = await bcrypt.hash(tempPlain, 10);
    target.mustChangePassword = true;
    await this.userRepo.save(target);
    return {
      userId: target.id,
      email: target.email,
      displayName: target.displayName,
      temporaryPassword: tempPlain,
    };
  }

  async updateRole(
    actor: JwtPayload,
    organizationId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<void> {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    const target = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!target) {
      throw new NotFoundException();
    }
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
    if (target.id === actor.sub) {
      throw new ForbiddenException();
    }
    target.role = dto.role;
    await this.userRepo.save(target);
  }
}
