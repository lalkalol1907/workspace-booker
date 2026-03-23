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
import { OrganizationSummaryDto } from './dto/organization-summary.dto';
import { UpdatePlatformUserRoleDto } from './dto/update-platform-user-role.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

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
