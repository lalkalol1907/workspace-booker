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

    if (
      (job.name === 'reminder' ||
        job.name === 'ending_soon' ||
        job.name === 'ended') &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      this.logger.debug(
        `Booking ${bookingId} is no longer confirmed, skipping ${job.name}`,
      );
      return;
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

    this.logger.log(
      `Sent "${job.name}" email to ${userEmail} for booking ${bookingId}`,
    );
  }
}
