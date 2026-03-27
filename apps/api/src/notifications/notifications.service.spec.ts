import { describe, it, expect, rstest, beforeEach } from '@rstest/core';
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

    it('removes pending reminder job if it exists', async () => {
      const { service, queue } = createService();
      const mockJob = { remove: rstest.fn().mockResolvedValue(undefined) };
      queue.getJob.mockResolvedValue(mockJob);

      await service.sendCancelled('b-1');

      expect(queue.getJob).toHaveBeenCalledWith('reminder-b-1');
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
});
