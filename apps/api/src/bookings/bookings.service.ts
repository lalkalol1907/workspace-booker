import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { ErrorCode } from '../common/enums/error-code.enum';
import { AppException } from '../common/exceptions/app.exception';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { isTenantAdmin } from '../common/utils/tenant-admin';
import { Booking } from '../entities/booking.entity';
import { Resource } from '../entities/resource.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { OCCUPYING_BOOKING_STATUSES } from './occupying-statuses';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly repo: Repository<Booking>,
    @InjectRepository(Resource)
    private readonly resources: Repository<Resource>,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(
    user: JwtPayload,
    organizationId: string,
    query: BookingQueryDto,
  ): Promise<BookingResponseDto[]> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.organizationId = :oid', { oid: organizationId });
    const calendarByResource =
      query.resourceId != null && query.resourceId !== '';
    if (isTenantAdmin(user)) {
      if (query.mine === true) {
        qb.andWhere('b.userId = :uid', { uid: user.sub });
      }
    } else if (!calendarByResource) {
      qb.andWhere('b.userId = :uid', { uid: user.sub });
    }
    if (query.resourceId) {
      qb.andWhere('b.resourceId = :rid', { rid: query.resourceId });
    }
    if (query.from) {
      qb.andWhere('b.endsAt > :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('b.startsAt < :to', { to: query.to });
    }
    qb.leftJoinAndSelect('b.resource', 'resource');
    qb.leftJoinAndSelect('b.user', 'user');
    qb.orderBy('b.startsAt', 'ASC');
    const rows = await qb.getMany();
    return rows.map((b) => this.toDto(b));
  }

  async findOne(
    user: JwtPayload,
    organizationId: string,
    id: string,
  ): Promise<BookingResponseDto> {
    const b = await this.repo.findOne({
      where: { id, organizationId },
      relations: ['resource', 'user'],
    });
    if (!b) {
      throw new AppException(ErrorCode.BOOKING_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (!isTenantAdmin(user) && b.userId !== user.sub) {
      throw new AppException(ErrorCode.BOOKING_FORBIDDEN, HttpStatus.FORBIDDEN);
    }
    return this.toDto(b);
  }

  async create(
    user: JwtPayload,
    organizationId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const res = await this.resources.findOne({
      where: {
        id: dto.resourceId,
        organizationId,
        isActive: true,
      },
    });
    if (!res) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_AVAILABLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.endsAt <= dto.startsAt) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      res.maxBookingMinutes != null &&
      dto.endsAt.getTime() - dto.startsAt.getTime() >
        res.maxBookingMinutes * 60 * 1000
    ) {
      throw new AppException(
        ErrorCode.BOOKING_DURATION_EXCEEDED,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const overlap = await this.repo
      .createQueryBuilder('b')
      .where('b.resourceId = :rid', { rid: dto.resourceId })
      .andWhere('b.organizationId = :oid', { oid: organizationId })
      .andWhere('b.status IN (:...occ)', { occ: OCCUPYING_BOOKING_STATUSES })
      .andWhere('b.startsAt < :end', { end: dto.endsAt })
      .andWhere('b.endsAt > :start', { start: dto.startsAt })
      .getCount();
    if (overlap > 0) {
      throw new AppException(ErrorCode.BOOKING_CONFLICT, HttpStatus.CONFLICT);
    }
    const b = this.repo.create({
      organizationId,
      resourceId: dto.resourceId,
      userId: user.sub,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      title: dto.title,
      status: BookingStatus.CONFIRMED,
    });
    await this.repo.save(b);
    await this.notifications.sendCreated(b.id);
    await this.notifications.scheduleReminder(b.id, b.startsAt);
    await this.notifications.scheduleInProgress(b.id, b.startsAt);
    await this.notifications.scheduleEndingSoon(b.id, b.endsAt);
    await this.notifications.scheduleEnded(b.id, b.endsAt);
    const withRelations = await this.repo.findOne({
      where: { id: b.id },
      relations: ['resource', 'user'],
    });
    return this.toDto(withRelations!);
  }

  async update(
    user: JwtPayload,
    organizationId: string,
    id: string,
    dto: UpdateBookingDto,
  ): Promise<BookingResponseDto> {
    const b = await this.repo.findOne({
      where: { id, organizationId },
      relations: ['resource'],
    });
    if (!b) {
      throw new AppException(ErrorCode.BOOKING_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (!isTenantAdmin(user) && b.userId !== user.sub) {
      throw new AppException(ErrorCode.BOOKING_FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    const wasCancelled = b.status === BookingStatus.CANCELLED;
    const wantsMetaEdit =
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined ||
      dto.title !== undefined;

    if (wasCancelled && wantsMetaEdit) {
      throw new AppException(
        ErrorCode.BOOKING_NOT_EDITABLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (b.status === BookingStatus.COMPLETED && wantsMetaEdit) {
      throw new AppException(
        ErrorCode.BOOKING_NOT_EDITABLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (
      dto.status === BookingStatus.IN_PROGRESS ||
      dto.status === BookingStatus.COMPLETED
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      dto.status === BookingStatus.CANCELLED &&
      (dto.startsAt !== undefined ||
        dto.endsAt !== undefined ||
        dto.title !== undefined)
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
      );
    }

    const prevStarts = b.startsAt;
    const prevEnds = b.endsAt;
    const newStarts = dto.startsAt ?? b.startsAt;
    const newEnds = dto.endsAt ?? b.endsAt;

    if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
      if (newEnds <= newStarts) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          HttpStatus.BAD_REQUEST,
        );
      }
      const res = b.resource;
      if (
        res?.maxBookingMinutes != null &&
        newEnds.getTime() - newStarts.getTime() >
          res.maxBookingMinutes * 60 * 1000
      ) {
        throw new AppException(
          ErrorCode.BOOKING_DURATION_EXCEEDED,
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const nextStatus = dto.status ?? b.status;
      if (OCCUPYING_BOOKING_STATUSES.includes(nextStatus)) {
        const overlap = await this.repo
          .createQueryBuilder('b')
          .where('b.resourceId = :rid', { rid: b.resourceId })
          .andWhere('b.organizationId = :oid', { oid: organizationId })
          .andWhere('b.status IN (:...occ)', {
            occ: OCCUPYING_BOOKING_STATUSES,
          })
          .andWhere('b.startsAt < :end', { end: newEnds })
          .andWhere('b.endsAt > :start', { start: newStarts })
          .andWhere('b.id != :bid', { bid: id })
          .getCount();
        if (overlap > 0) {
          throw new AppException(
            ErrorCode.BOOKING_CONFLICT,
            HttpStatus.CONFLICT,
          );
        }
      }

      b.startsAt = newStarts;
      b.endsAt = newEnds;
    }

    if (dto.title !== undefined) {
      b.title = dto.title.trim();
    }

    if (dto.status !== undefined) {
      b.status = dto.status;
    }

    const timesChanged =
      (dto.startsAt !== undefined || dto.endsAt !== undefined) &&
      (b.startsAt.getTime() !== prevStarts.getTime() ||
        b.endsAt.getTime() !== prevEnds.getTime());

    await this.repo.save(b);

    if (!wasCancelled && b.status === BookingStatus.CANCELLED) {
      await this.notifications.sendCancelled(b.id);
    } else if (
      (b.status === BookingStatus.CONFIRMED ||
        b.status === BookingStatus.IN_PROGRESS) &&
      timesChanged
    ) {
      await this.notifications.rescheduleScheduledJobs(
        b.id,
        b.startsAt,
        b.endsAt,
      );
    }

    const withResource = await this.repo.findOne({
      where: { id: b.id },
      relations: ['resource', 'user'],
    });
    return this.toDto(withResource!);
  }

  async remove(
    user: JwtPayload,
    organizationId: string,
    id: string,
  ): Promise<void> {
    const b = await this.repo.findOne({
      where: { id, organizationId },
    });
    if (!b) {
      throw new AppException(ErrorCode.BOOKING_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (!isTenantAdmin(user) && b.userId !== user.sub) {
      throw new AppException(ErrorCode.BOOKING_FORBIDDEN, HttpStatus.FORBIDDEN);
    }
    if (
      b.status === BookingStatus.CANCELLED ||
      b.status === BookingStatus.COMPLETED
    ) {
      throw new AppException(
        ErrorCode.BOOKING_NOT_EDITABLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    b.status = BookingStatus.CANCELLED;
    await this.repo.save(b);
    await this.notifications.sendCancelled(b.id);
  }

  private toDto(b: Booking): BookingResponseDto {
    return {
      id: b.id,
      resourceId: b.resourceId,
      resourceName: b.resource?.name ?? '',
      userId: b.userId,
      userDisplayName: b.user?.displayName ?? '',
      userEmail: b.user?.email ?? '',
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      title: b.title,
      status: b.status,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }
}
