import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentTenantOrg } from '../common/decorators/current-tenant-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { InviteUserDto } from './dto/invite-user.dto';
import { InviteUserResponseDto } from './dto/invite-user-response.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users in tenant' })
  @ApiOkResponse({ type: UserSummaryDto, isArray: true })
  list(
    @CurrentUser() _user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
  ): Promise<UserSummaryDto[]> {
    return this.users.list(organizationId);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reset user password',
    description:
      'Generates a new one-time temporary password and requires change on next login. Cannot target yourself or another tenant admin (unless platform admin).',
  })
  @ApiCreatedResponse({ type: InviteUserResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  resetPassword(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InviteUserResponseDto> {
    return this.users.resetPassword(user, organizationId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description:
      'Removes the user and all their bookings (CASCADE). Cannot delete yourself or another administrator.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse({
    description: 'Cannot delete self or another admin',
  })
  remove(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.users.remove(user, organizationId, id);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Invite user (temporary password)',
    description:
      'Creates a member account in the current tenant. The temporary password is returned once.',
  })
  @ApiBody({ type: InviteUserDto })
  @ApiCreatedResponse({ type: InviteUserResponseDto })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  invite(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Body() dto: InviteUserDto,
  ): Promise<InviteUserResponseDto> {
    return this.users.invite(user, organizationId, dto);
  }
}
