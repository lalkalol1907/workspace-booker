import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Booking } from 'api/src/entities/booking.entity';
import { BookingStatus } from 'api/src/common/enums/booking-status.enum';

interface BookingJobData {
  bookingId: string;
}

@Processor('booking-notifications')
export class BookingNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingNotificationProcessor.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly mailer: MailerService,
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

    if (job.name === 'reminder' && booking.status !== BookingStatus.CONFIRMED) {
      this.logger.debug(
        `Booking ${bookingId} is no longer confirmed, skipping reminder`,
      );
      return;
    }

    const userEmail = booking.user?.email;
    if (!userEmail) {
      this.logger.warn(`No email for booking ${bookingId}, skipping`);
      return;
    }

    const resourceName = booking.resource?.name ?? 'Ресурс';
    const startsAt = booking.startsAt.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });
    const endsAt = booking.endsAt.toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });

    const templates: Record<string, { subject: string; text: string }> = {
      created: {
        subject: 'Бронирование подтверждено',
        text: [
          `Ваше бронирование подтверждено.`,
          ``,
          `Ресурс: ${resourceName}`,
          `Название: ${booking.title}`,
          `Начало: ${startsAt}`,
          `Конец: ${endsAt}`,
        ].join('\n'),
      },
      reminder: {
        subject: 'Напоминание: бронирование через 15 минут',
        text: [
          `Через 15 минут начнётся ваше бронирование.`,
          ``,
          `Ресурс: ${resourceName}`,
          `Название: ${booking.title}`,
          `Начало: ${startsAt}`,
          `Конец: ${endsAt}`,
        ].join('\n'),
      },
      cancelled: {
        subject: 'Бронирование отменено',
        text: [
          `Ваше бронирование было отменено.`,
          ``,
          `Ресурс: ${resourceName}`,
          `Название: ${booking.title}`,
          `Начало: ${startsAt}`,
          `Конец: ${endsAt}`,
        ].join('\n'),
      },
    };

    const tpl = templates[job.name];
    if (!tpl) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    await this.mailer.sendMail({
      to: userEmail,
      subject: tpl.subject,
      text: tpl.text,
    });

    this.logger.log(
      `Sent "${job.name}" email to ${userEmail} for booking ${bookingId}`,
    );
  }
}
