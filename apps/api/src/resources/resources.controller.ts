import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
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
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { BusyIntervalResponseDto } from './dto/busy-interval-response.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { ResourceResponseDto } from './dto/resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'List resources' })
  @ApiOkResponse({ type: ResourceResponseDto, isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Query() query: ResourceQueryDto,
  ): Promise<ResourceResponseDto[]> {
    return this.resources.findAll(organizationId, query);
  }

  @Get(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Busy intervals in range' })
  @ApiOkResponse({ type: BusyIntervalResponseDto, isArray: true })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  availability(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<BusyIntervalResponseDto[]> {
    return this.resources.availability(organizationId, id, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get resource' })
  @ApiOkResponse({ type: ResourceResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResourceResponseDto> {
    return this.resources.findOne(organizationId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create resource' })
  @ApiBody({ type: CreateResourceDto })
  @ApiOkResponse({ type: ResourceResponseDto })
  @ApiForbiddenResponse()
  create(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Body() dto: CreateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.resources.create(organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update resource' })
  @ApiBody({ type: UpdateResourceDto })
  @ApiOkResponse({ type: ResourceResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  update(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.resources.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate resource' })
  @ApiOkResponse({ description: 'Deactivated' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async remove(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.resources.remove(organizationId, id);
  }
}
