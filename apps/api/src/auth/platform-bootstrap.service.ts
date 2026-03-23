import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../entities/user.entity';

/** Optional first super_admin when PLATFORM_BOOTSTRAP_EMAIL / PASSWORD are set. */
@Injectable()
export class PlatformBootstrapService implements OnModuleInit {
  private readonly log = new Logger(PlatformBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('PLATFORM_BOOTSTRAP_EMAIL')?.trim();
    const password = this.config.get<string>('PLATFORM_BOOTSTRAP_PASSWORD');
    if (!email || !password) {
      return;
    }
    const exists = await this.userRepo.exist({
      where: { role: UserRole.SUPER_ADMIN },
    });
    if (exists) {
      return;
    }
    await this.userRepo.save(
      this.userRepo.create({
        organizationId: null,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        displayName: 'Platform admin',
        role: UserRole.SUPER_ADMIN,
        mustChangePassword: false,
      }),
    );
    this.log.log(
      'Created initial platform admin from PLATFORM_BOOTSTRAP_* env',
    );
  }
}
