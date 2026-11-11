import { Router } from 'express';
import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import type { InMemoryQueue } from '../tasks/queue.js';

export type QueueMetrics = {
  router: Router;
  incrementEnqueued: () => void;
};

export function createQueueMetrics(queue: InMemoryQueue): QueueMetrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  const waitingGauge = new Gauge({ name: 'task_queue_waiting', help: 'Tasks waiting to be processed', registers: [registry] });
  const activeGauge = new Gauge({ name: 'task_queue_active', help: 'Tasks currently being processed', registers: [registry] });
  const completedGauge = new Gauge({ name: 'task_queue_completed', help: 'Completed tasks', registers: [registry] });
  const failedGauge = new Gauge({ name: 'task_queue_dead_letter', help: 'Tasks in the dead-letter queue', registers: [registry] });
  const enqueuedCounter = new Counter({ name: 'task_queue_enqueued_total', help: 'Total tasks accepted', registers: [registry] });
  const router = Router();

  router.get('/', async (_req, res) => {
    const counts = queue.counts();
    waitingGauge.set(counts.waiting + counts.delayed);
    activeGauge.set(counts.active);
    completedGauge.set(counts.completed);
    failedGauge.set(counts.failed);
    res.set('Content-Type', registry.contentType).send(await registry.metrics());
  });

  return { router, incrementEnqueued: () => enqueuedCounter.inc() };
}