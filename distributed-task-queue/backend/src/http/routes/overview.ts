import { Router } from 'express';
import type { ScheduleManager } from '../../schedules/manager.js';
import type { InMemoryQueue } from '../../tasks/queue.js';

export function createOverviewRouter(queue: InMemoryQueue, schedules: ScheduleManager, workerCount: number, workerPollIntervalMs: number) {
  const router = Router();
  router.get('/health', (_req, res) => res.json({ status: 'ok', storage: 'in-memory', databaseConnected: false, workerCount, workerPollIntervalMs }));
  router.get('/overview', (_req, res) => {
    const counts = queue.counts();
    const all = queue.list();
    const completed = all.filter((task) => task.status === 'completed' && task.finishedAt);
    const avgDurationMs = completed.length
      ? Math.round(completed.reduce((sum, task) => sum + task.finishedAt!.getTime() - (task.startedAt ?? task.createdAt).getTime(), 0) / completed.length)
      : 0;
    res.json({ counts, paused: queue.isPaused(), workerCount, avgDurationMs, recent: all.slice(0, 8), schedules: schedules.list().length });
  });
  return router;
}