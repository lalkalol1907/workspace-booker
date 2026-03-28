import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { AppException } from '../common/exceptions/app.exception';
import { Repository } from 'typeorm';
import { OCCUPYING_BOOKING_STATUSES } from '../bookings/occupying-statuses';
import { Booking } from '../entities/booking.entity';
import { Location } from '../entities/location.entity';
import { Resource } from '../entities/resource.entity';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { BusyIntervalResponseDto } from './dto/busy-interval-response.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourceQueryDto } from './dto/resource-query.dto';
import { ResourceResponseDto } from './dto/resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource)
    private readonly repo: Repository<Resource>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
  ) {}

  async findAll(
    organizationId: string,
    query: ResourceQueryDto,
  ): Promise<ResourceResponseDto[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.organizationId = :oid', { oid: organizationId });
    if (query.locationId) {
      qb.andWhere('r.locationId = :lid', { lid: query.locationId });
    }
    if (query.type) {
      qb.andWhere('r.type = :type', { type: query.type });
    }
    if (query.active !== undefined) {
      qb.andWhere('r.isActive = :act', { act: query.active });
    }
    qb.orderBy('r.name', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => this.toDto(r));
  }

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<ResourceResponseDto> {
    const r = await this.repo.findOne({ where: { id, organizationId } });
    if (!r) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toDto(r);
  }

  async availability(
    organizationId: string,
    resourceId: string,
    q: AvailabilityQueryDto,
  ): Promise<BusyIntervalResponseDto[]> {
    await this.requireInOrg(organizationId, resourceId);
    if (q.to <= q.from) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }
    const rows = await this.bookings
      .createQueryBuilder('b')
      .where('b.resourceId = :rid', { rid: resourceId })
      .andWhere('b.organizationId = :oid', { oid: organizationId })
      .andWhere('b.status IN (:...occ)', { occ: OCCUPYING_BOOKING_STATUSES })
      .andWhere('b.startsAt < :end', { end: q.to })
      .andWhere('b.endsAt > :start', { start: q.from })
      .orderBy('b.starts_at', 'ASC')
      .getMany();
    return rows.map((b) => ({
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      bookingId: b.id,
    }));
  }

  async create(
    organizationId: string,
    dto: CreateResourceDto,
  ): Promise<ResourceResponseDto> {
    const loc = await this.locations.findOne({
      where: { id: dto.locationId, organizationId },
    });
    if (!loc) {
      throw new AppException(
        ErrorCode.LOCATION_NOT_FOUND,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const r = this.repo.create({
      organizationId,
      locationId: dto.locationId,
      name: dto.name,
      type: dto.type,
      capacity: dto.capacity,
      maxBookingMinutes: dto.maxBookingMinutes ?? null,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata ?? null,
    });
    await this.repo.save(r);
    return this.toDto(r);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    const r = await this.requireInOrg(organizationId, id);
    if (dto.locationId !== undefined) {
      const loc = await this.locations.findOne({
        where: { id: dto.locationId, organizationId },
      });
      if (!loc) {
        throw new AppException(
          ErrorCode.LOCATION_NOT_FOUND,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      r.locationId = dto.locationId;
    }
    if (dto.name !== undefined) {
      r.name = dto.name;
    }
    if (dto.type !== undefined) {
      r.type = dto.type;
    }
    if (dto.capacity !== undefined) {
      r.capacity = dto.capacity;
    }
    if (dto.maxBookingMinutes !== undefined) {
      r.maxBookingMinutes = dto.maxBookingMinutes ?? null;
    }
    if (dto.isActive !== undefined) {
      r.isActive = dto.isActive;
    }
    if (dto.metadata !== undefined) {
      r.metadata = dto.metadata;
    }
    await this.repo.save(r);
    return this.toDto(r);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const r = await this.requireInOrg(organizationId, id);
    r.isActive = false;
    await this.repo.save(r);
  }

  private async requireInOrg(
    organizationId: string,
    id: string,
  ): Promise<Resource> {
    const r = await this.repo.findOne({ where: { id, organizationId } });
    if (!r) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return r;
  }

  private toDto(r: Resource): ResourceResponseDto {
    return {
      id: r.id,
      locationId: r.locationId,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      maxBookingMinutes: r.maxBookingMinutes ?? null,
      isActive: r.isActive,
      metadata: r.metadata,
      createdAt: r.createdAt,
    };
  }
}
