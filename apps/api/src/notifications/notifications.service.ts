import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('booking-notifications')
    private readonly queue: Queue,
  ) {}

  async sendCreated(bookingId: string): Promise<void> {
    await this.queue.add('created', { bookingId }, { removeOnComplete: true });
    this.logger.debug(`Enqueued "created" for booking ${bookingId}`);
  }

  /** Письмо с временным паролем новому платформенному администратору. */
  async sendPlatformAdminWelcomeEmail(payload: {
    email: string;
    displayName: string;
    temporaryPassword: string;
  }): Promise<void> {
    await this.queue.add('platform_admin_welcome', payload, {
      removeOnComplete: true,
    });
    this.logger.debug(`Enqueued platform_admin_welcome for ${payload.email}`);
  }

  /** В момент начала брони — перевод в статус «идёт сейчас». */
  async scheduleInProgress(bookingId: string, startsAt: Date): Promise<void> {
    const delay = Math.max(0, startsAt.getTime() - Date.now());
    await this.queue.add(
      'in_progress',
      { bookingId },
      {
        delay,
        jobId: `in-progress-${bookingId}`,
        removeOnComplete: true,
      },
    );
    this.logger.debug(
      `Scheduled in_progress for booking ${bookingId} in ${Math.round(delay / 1000)}s`,
    );
  }

  async scheduleReminder(bookingId: string, startsAt: Date): Promise<void> {
    const delay = startsAt.getTime() - FIFTEEN_MINUTES_MS - Date.now();
    if (delay <= 0) {
      return;
    }
    await this.queue.add(
      'reminder',
      { bookingId },
      {
        delay,
        jobId: `reminder-${bookingId}`,
        removeOnComplete: true,
      },
    );
    this.logger.debug(
      `Scheduled reminder for booking ${bookingId} in ${Math.round(delay / 1000)}s`,
    );
  }

  /** За 15 минут до окончания слота (если до конца больше 15 минут). */
  async scheduleEndingSoon(bookingId: string, endsAt: Date): Promise<void> {
    const fireAt = endsAt.getTime() - FIFTEEN_MINUTES_MS;
    const delay = fireAt - Date.now();
    if (delay <= 0) {
      return;
    }
    await this.queue.add(
      'ending_soon',
      { bookingId },
      {
        delay,
        jobId: `ending-soon-${bookingId}`,
        removeOnComplete: true,
      },
    );
    this.logger.debug(
      `Scheduled "ending soon" for booking ${bookingId} in ${Math.round(delay / 1000)}s`,
    );
  }

  /** В момент окончания брони. */
  async scheduleEnded(bookingId: string, endsAt: Date): Promise<void> {
    const delay = endsAt.getTime() - Date.now();
    if (delay <= 0) {
      return;
    }
    await this.queue.add(
      'ended',
      { bookingId },
      {
        delay,
        jobId: `ended-${bookingId}`,
        removeOnComplete: true,
      },
    );
    this.logger.debug(
      `Scheduled "ended" for booking ${bookingId} in ${Math.round(delay / 1000)}s`,
    );
  }

  private async removeJobIfExists(jobId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.debug(`Removed pending job ${jobId}`);
      }
    } catch {
      /* job already processed or missing — ignore */
    }
  }

  async sendCancelled(bookingId: string): Promise<void> {
    await this.removeJobIfExists(`reminder-${bookingId}`);
    await this.removeJobIfExists(`in-progress-${bookingId}`);
    await this.removeJobIfExists(`ending-soon-${bookingId}`);
    await this.removeJobIfExists(`ended-${bookingId}`);
    await this.queue.add(
      'cancelled',
      { bookingId },
      { removeOnComplete: true },
    );
    this.logger.debug(`Enqueued "cancelled" for booking ${bookingId}`);
  }

  /** Перенос отложенных напоминаний после смены времени брони (без повторной рассылки «создано»). */
  async rescheduleScheduledJobs(
    bookingId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    await this.removeJobIfExists(`reminder-${bookingId}`);
    await this.removeJobIfExists(`in-progress-${bookingId}`);
    await this.removeJobIfExists(`ending-soon-${bookingId}`);
    await this.removeJobIfExists(`ended-${bookingId}`);
    await this.scheduleReminder(bookingId, startsAt);
    await this.scheduleInProgress(bookingId, startsAt);
    await this.scheduleEndingSoon(bookingId, endsAt);
    await this.scheduleEnded(bookingId, endsAt);
    this.logger.debug(`Rescheduled delayed jobs for booking ${bookingId}`);
  }
}
