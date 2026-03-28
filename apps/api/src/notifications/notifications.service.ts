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
    await this.removeJobIfExists(`ending-soon-${bookingId}`);
    await this.removeJobIfExists(`ended-${bookingId}`);
    await this.queue.add(
      'cancelled',
      { bookingId },
      { removeOnComplete: true },
    );
    this.logger.debug(`Enqueued "cancelled" for booking ${bookingId}`);
  }
}
