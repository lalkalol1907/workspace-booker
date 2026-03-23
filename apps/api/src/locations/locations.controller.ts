import {
  Body,
  Controller,
  Delete,
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
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'List locations' })
  @ApiOkResponse({ type: LocationResponseDto, isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
  ): Promise<LocationResponseDto[]> {
    return this.locations.findAll(organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create location' })
  @ApiBody({ type: CreateLocationDto })
  @ApiOkResponse({ type: LocationResponseDto })
  @ApiForbiddenResponse()
  create(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locations.create(organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update location' })
  @ApiBody({ type: UpdateLocationDto })
  @ApiOkResponse({ type: LocationResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  update(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locations.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete location' })
  @ApiOkResponse({ description: 'No content' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async remove(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.locations.remove(organizationId, id);
  }
}
