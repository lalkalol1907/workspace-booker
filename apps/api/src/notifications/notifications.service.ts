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

  async sendCancelled(bookingId: string): Promise<void> {
    try {
      const reminderJob = await this.queue.getJob(`reminder-${bookingId}`);
      if (reminderJob) {
        await reminderJob.remove();
        this.logger.debug(`Removed pending reminder for booking ${bookingId}`);
      }
    } catch {
      /* reminder already processed or missing — ignore */
    }
    await this.queue.add(
      'cancelled',
      { bookingId },
      { removeOnComplete: true },
    );
    this.logger.debug(`Enqueued "cancelled" for booking ${bookingId}`);
  }
}
