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
  ApiConflictResponse,
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
import { BookingsService } from './bookings.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('jwt')
@ApiUnauthorizedResponse()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'List bookings' })
  @ApiOkResponse({ type: BookingResponseDto, isArray: true })
  findAll(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Query() query: BookingQueryDto,
  ): Promise<BookingResponseDto[]> {
    return this.bookings.findAll(user, organizationId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get booking' })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  findOne(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponseDto> {
    return this.bookings.findOne(user, organizationId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Create booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiConflictResponse({ description: 'Time overlap' })
  @ApiForbiddenResponse()
  create(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookings.create(user, organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Update booking' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  update(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookings.update(user, organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiOkResponse({ description: 'Cancelled' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  async remove(
    @CurrentUser() user: JwtPayload,
    @CurrentTenantOrg() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.bookings.remove(user, organizationId, id);
  }
}
