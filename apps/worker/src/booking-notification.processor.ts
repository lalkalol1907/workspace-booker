import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { BookingStatus } from './common/enums/booking-status.enum';
import { Booking } from './entities/booking.entity';
import type { MailerConfig } from './config/mailer.config';
import {
  bookingMailSubject,
  buildBookingMailViewModel,
  renderBookingMail,
  type BookingMailKind,
} from './mail/render-booking-mail';

interface BookingJobData {
  bookingId: string;
}

const JOB_TO_KIND: Record<string, BookingMailKind | undefined> = {
  created: 'created',
  reminder: 'reminder',
  ending_soon: 'ending_soon',
  ended: 'ended',
  cancelled: 'cancelled',
};

@Processor('booking-notifications')
export class BookingNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingNotificationProcessor.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<BookingJobData>): Promise<void> {
    const { bookingId } = job.data;
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['user', 'resource'],
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found, skipping`);
      return;
    }

    if (job.name === 'in_progress') {
      await this.applyInProgressStatus(booking);
      return;
    }

    if (
      job.name === 'reminder' &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      this.logger.debug(
        `Booking ${bookingId} is not confirmed, skipping ${job.name}`,
      );
      return;
    }

    if (
      job.name === 'ending_soon' &&
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.IN_PROGRESS
    ) {
      this.logger.debug(
        `Booking ${bookingId} is not active, skipping ${job.name}`,
      );
      return;
    }

    if (job.name === 'ended') {
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.COMPLETED
      ) {
        this.logger.debug(
          `Booking ${bookingId} already finished, skipping ${job.name}`,
        );
        return;
      }
      if (
        booking.status !== BookingStatus.CONFIRMED &&
        booking.status !== BookingStatus.IN_PROGRESS
      ) {
        return;
      }
    }

    const userEmail = booking.user?.email;
    if (!userEmail) {
      this.logger.warn(`No email for booking ${bookingId}, skipping`);
      return;
    }

    const kind = JOB_TO_KIND[job.name];
    if (!kind) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    const mail = this.config.getOrThrow<MailerConfig>('mailer');
    const resourceName = booking.resource?.name ?? 'Ресурс';
    const startsAt = booking.startsAt.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });
    const endsAt = booking.endsAt.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });

    const viewModel = buildBookingMailViewModel(kind, {
      appName: mail.appName,
      userName: booking.user?.displayName?.trim() || 'Участник',
      resourceName,
      title: booking.title,
      startsAt,
      endsAt,
    });

    const { html, text } = await renderBookingMail(kind, viewModel);

    await this.mailer.sendMail({
      to: userEmail,
      subject: bookingMailSubject(kind),
      html,
      text,
    });

    if (job.name === 'ended') {
      booking.status = BookingStatus.COMPLETED;
      await this.bookingRepo.save(booking);
    }

    this.logger.log(
      `Sent "${job.name}" email to ${userEmail} for booking ${bookingId}`,
    );
  }

  private async applyInProgressStatus(booking: Booking): Promise<void> {
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      return;
    }
    if (booking.status === BookingStatus.IN_PROGRESS) {
      return;
    }
    const now = Date.now();
    const start = booking.startsAt.getTime();
    const end = booking.endsAt.getTime();
    if (now >= end) {
      booking.status = BookingStatus.COMPLETED;
      await this.bookingRepo.save(booking);
      this.logger.debug(
        `Booking ${booking.id} marked completed (in_progress job after end)`,
      );
      return;
    }
    if (now >= start && booking.status === BookingStatus.CONFIRMED) {
      booking.status = BookingStatus.IN_PROGRESS;
      await this.bookingRepo.save(booking);
      this.logger.debug(`Booking ${booking.id} marked in_progress`);
    }
  }
}
