import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { UserRole } from '../enums/user-role.enum';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/** Tenant org for the request: JWT org for normal users, X-Organization-Id for platform admin. */
export const CurrentTenantOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<
      FastifyRequest & { user: JwtPayload }
    >();
    const user = req.user;
    if (user.role === UserRole.SUPER_ADMIN) {
      const raw = req.headers['x-organization-id'];
      const id =
        typeof raw === 'string'
          ? raw.trim()
          : Array.isArray(raw)
            ? raw[0]?.trim()
            : '';
      if (!id) {
        throw new BadRequestException('Missing X-Organization-Id header');
      }
      return id;
    }
    if (!user.organizationId) {
      throw new BadRequestException();
    }
    return user.organizationId;
  },
);
