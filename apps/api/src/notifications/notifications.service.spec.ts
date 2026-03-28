import { describe, it, expect, rstest } from '@rstest/core';
import { NotificationsService } from './notifications.service';

function createService() {
  const queue = {
    add: rstest.fn().mockResolvedValue(undefined),
    getJob: rstest.fn().mockResolvedValue(null),
  };

  const service = new NotificationsService(queue as any);

  return { service, queue };
}

describe('NotificationsService', () => {
  describe('sendPlatformAdminWelcomeEmail', () => {
    it('enqueues platform_admin_welcome job', async () => {
      const { service, queue } = createService();

      await service.sendPlatformAdminWelcomeEmail({
        email: 'a@test.com',
        displayName: 'Admin',
        temporaryPassword: 'secret',
      });

      expect(queue.add).toHaveBeenCalledWith(
        'platform_admin_welcome',
        {
          email: 'a@test.com',
          displayName: 'Admin',
          temporaryPassword: 'secret',
        },
        { removeOnComplete: true },
      );
    });
  });

  describe('sendCreated', () => {
    it('enqueues a created job', async () => {
      const { service, queue } = createService();

      await service.sendCreated('b-1');

      expect(queue.add).toHaveBeenCalledWith(
        'created',
        { bookingId: 'b-1' },
        { removeOnComplete: true },
      );
    });
  });

  describe('scheduleInProgress', () => {
    it('enqueues a delayed job at startsAt', async () => {
      const { service, queue } = createService();
      const startsAt = new Date(Date.now() + 45 * 60 * 1000);

      await service.scheduleInProgress('b-1', startsAt);

      expect(queue.add).toHaveBeenCalledWith(
        'in_progress',
        { bookingId: 'b-1' },
        expect.objectContaining({
          jobId: 'in-progress-b-1',
          removeOnComplete: true,
        }),
      );
      const opts = queue.add.mock.calls[0][2];
      expect(opts.delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('scheduleReminder', () => {
    it('enqueues a delayed reminder job', async () => {
      const { service, queue } = createService();
      const future = new Date(Date.now() + 60 * 60 * 1000);

      await service.scheduleReminder('b-1', future);

      expect(queue.add).toHaveBeenCalledWith(
        'reminder',
        { bookingId: 'b-1' },
        expect.objectContaining({
          jobId: 'reminder-b-1',
          removeOnComplete: true,
        }),
      );
      const opts = queue.add.mock.calls[0][2];
      expect(opts.delay).toBeGreaterThan(0);
    });

    it('skips when startsAt is less than 15min away', async () => {
      const { service, queue } = createService();
      const soon = new Date(Date.now() + 5 * 60 * 1000);

      await service.scheduleReminder('b-1', soon);

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('skips when startsAt is in the past', async () => {
      const { service, queue } = createService();
      const past = new Date(Date.now() - 60 * 1000);

      await service.scheduleReminder('b-1', past);

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('scheduleEndingSoon', () => {
    it('enqueues a delayed job 15 minutes before endsAt', async () => {
      const { service, queue } = createService();
      const endsAt = new Date(Date.now() + 60 * 60 * 1000);

      await service.scheduleEndingSoon('b-1', endsAt);

      expect(queue.add).toHaveBeenCalledWith(
        'ending_soon',
        { bookingId: 'b-1' },
        expect.objectContaining({
          jobId: 'ending-soon-b-1',
          removeOnComplete: true,
        }),
      );
      const opts = queue.add.mock.calls[0][2];
      expect(opts.delay).toBeGreaterThan(0);
    });

    it('skips when less than 15 minutes remain until end', async () => {
      const { service, queue } = createService();
      const endsAt = new Date(Date.now() + 5 * 60 * 1000);

      await service.scheduleEndingSoon('b-1', endsAt);

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('scheduleEnded', () => {
    it('enqueues a delayed job at endsAt', async () => {
      const { service, queue } = createService();
      const endsAt = new Date(Date.now() + 30 * 60 * 1000);

      await service.scheduleEnded('b-1', endsAt);

      expect(queue.add).toHaveBeenCalledWith(
        'ended',
        { bookingId: 'b-1' },
        expect.objectContaining({
          jobId: 'ended-b-1',
          removeOnComplete: true,
        }),
      );
      const opts = queue.add.mock.calls[0][2];
      expect(opts.delay).toBeGreaterThan(0);
    });

    it('skips when endsAt is already in the past', async () => {
      const { service, queue } = createService();
      const past = new Date(Date.now() - 60 * 1000);

      await service.scheduleEnded('b-1', past);

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('sendCancelled', () => {
    it('enqueues a cancelled job', async () => {
      const { service, queue } = createService();

      await service.sendCancelled('b-1');

      expect(queue.add).toHaveBeenCalledWith(
        'cancelled',
        { bookingId: 'b-1' },
        { removeOnComplete: true },
      );
    });

    it('removes pending delayed jobs if they exist', async () => {
      const { service, queue } = createService();
      const mockJob = { remove: rstest.fn().mockResolvedValue(undefined) };
      queue.getJob.mockResolvedValue(mockJob);

      await service.sendCancelled('b-1');

      expect(queue.getJob).toHaveBeenCalledWith('reminder-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('in-progress-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('ending-soon-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('ended-b-1');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        'cancelled',
        { bookingId: 'b-1' },
        { removeOnComplete: true },
      );
    });

    it('still enqueues cancelled even if reminder removal fails', async () => {
      const { service, queue } = createService();
      queue.getJob.mockRejectedValue(new Error('redis error'));

      await service.sendCancelled('b-1');

      expect(queue.add).toHaveBeenCalledWith(
        'cancelled',
        { bookingId: 'b-1' },
        { removeOnComplete: true },
      );
    });
  });

  describe('rescheduleScheduledJobs', () => {
    it('removes delayed jobs then schedules reminder, in_progress, ending_soon, ended', async () => {
      const { service, queue } = createService();
      queue.getJob.mockResolvedValue(null);
      const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 3 * 60 * 60 * 1000);

      await service.rescheduleScheduledJobs('b-1', futureStart, futureEnd);

      expect(queue.getJob).toHaveBeenCalledWith('reminder-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('in-progress-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('ending-soon-b-1');
      expect(queue.getJob).toHaveBeenCalledWith('ended-b-1');
      expect(queue.add).toHaveBeenCalledWith(
        'reminder',
        { bookingId: 'b-1' },
        expect.any(Object),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'in_progress',
        { bookingId: 'b-1' },
        expect.any(Object),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'ending_soon',
        { bookingId: 'b-1' },
        expect.any(Object),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'ended',
        { bookingId: 'b-1' },
        expect.any(Object),
      );
    });
  });
});
