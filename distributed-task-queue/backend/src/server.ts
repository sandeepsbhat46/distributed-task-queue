import 'dotenv/config';
import { createApp } from './http/app.js';
import { createQueueMetrics } from './metrics/queue-metrics.js';
import { ScheduleManager } from './schedules/manager.js';
import { createDemoTasks } from './tasks/demo-data.js';
import { InMemoryQueue } from './tasks/queue.js';
import { startWorkers } from './workers/worker.js';

const queue = new InMemoryQueue();
for (const task of createDemoTasks()) queue.restore(task);

const workerCount = Math.max(1, Math.min(16, Number(process.env.WORKER_CONCURRENCY) || 3));
const workerPollIntervalMs = Math.max(100, Number(process.env.WORKER_POLL_INTERVAL_MS) || 500);
const schedules = new ScheduleManager(queue);
const metrics = createQueueMetrics(queue);
const app = createApp({ queue, schedules, metrics, workerCount, workerPollIntervalMs });
const stopWorkers = startWorkers(queue, workerCount, workerPollIntervalMs);
const server = app.listen(Number(process.env.PORT) || 4000, '127.0.0.1', () => {
  console.log(`Task queue API listening on http://127.0.0.1:${Number(process.env.PORT) || 4000}`);
});

function shutdown() {
  stopWorkers();
  schedules.stopAll();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);