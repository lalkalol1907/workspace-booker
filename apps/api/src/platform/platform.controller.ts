import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreatePlatformOrganizationDto } from './dto/create-platform-organization.dto';
import { PlatformAdminSummaryDto } from './dto/platform-admin-summary.dto';
import { PlatformAdminUpsertResultDto } from './dto/platform-admin-upsert-result.dto';
import { OrganizationSummaryDto } from './dto/organization-summary.dto';
import { UpsertPlatformAdminDto } from './dto/upsert-platform-admin.dto';
import { UpdatePlatformOrganizationDto } from './dto/update-platform-organization.dto';
import { UpdatePlatformUserRoleDto } from './dto/update-platform-user-role.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List platform admins' })
  @ApiOkResponse({ type: PlatformAdminSummaryDto, isArray: true })
  listAdmins(): Promise<PlatformAdminSummaryDto[]> {
    return this.platform.listPlatformAdmins();
  }

  @Post('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create or promote platform admin by email',
  })
  @ApiBody({ type: UpsertPlatformAdminDto })
  @ApiCreatedResponse({ type: PlatformAdminUpsertResultDto })
  @ApiConflictResponse({
    description: 'Conflicting duplicate users with same email',
  })
  upsertAdmin(
    @CurrentUser() _user: JwtPayload,
    @Body() dto: UpsertPlatformAdminDto,
  ): Promise<PlatformAdminUpsertResultDto> {
    return this.platform.upsertPlatformAdmin(dto);
  }

  @Get('organizations')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants' })
  @ApiOkResponse({ type: OrganizationSummaryDto, isArray: true })
  listOrganizations(): Promise<OrganizationSummaryDto[]> {
    return this.platform.listOrganizations();
  }

  @Post('organizations')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create tenant' })
  @ApiBody({ type: CreatePlatformOrganizationDto })
  @ApiCreatedResponse({ type: OrganizationSummaryDto })
  @ApiConflictResponse({ description: 'Slug or host already in use' })
  createOrganization(
    @CurrentUser() _user: JwtPayload,
    @Body() dto: CreatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    return this.platform.createOrganization(dto);
  }

  @Patch('organizations/:organizationId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant' })
  @ApiBody({ type: UpdatePlatformOrganizationDto })
  @ApiOkResponse({ type: OrganizationSummaryDto })
  @ApiConflictResponse({ description: 'Slug or host already in use' })
  updateOrganization(
    @CurrentUser() _user: JwtPayload,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdatePlatformOrganizationDto,
  ): Promise<OrganizationSummaryDto> {
    return this.platform.updateOrganization(organizationId, dto);
  }

  @Patch('organizations/:organizationId/users/:userId/role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Set tenant user role (admin / member)',
  })
  @ApiBody({ type: UpdatePlatformUserRoleDto })
  @ApiOkResponse({ description: 'Updated' })
  updateUserRole(
    @CurrentUser() _user: JwtPayload,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdatePlatformUserRoleDto,
  ): Promise<void> {
    return this.platform.updateUserRole(organizationId, userId, dto);
  }
}
