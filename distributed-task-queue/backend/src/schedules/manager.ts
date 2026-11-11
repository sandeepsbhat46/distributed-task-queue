import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { InMemoryQueue } from '../tasks/queue.js';
import type { Schedule } from '../tasks/types.js';

type NewSchedule = Pick<Schedule, 'name' | 'cron' | 'payload'>;

export class ScheduleManager {
  private readonly schedules = new Map<string, Schedule>();
  private readonly cronJobs = new Map<string, ScheduledTask>();

  constructor(private readonly queue: InMemoryQueue) {}

  list(): Schedule[] {
    return [...this.schedules.values()];
  }

  create(input: NewSchedule): Schedule {
    const schedule: Schedule = { ...input, id: randomUUID(), enabled: true, nextRunAt: new Date(Date.now() + 60_000) };
    this.schedules.set(schedule.id, schedule);
    this.cronJobs.set(schedule.id, cron.schedule(schedule.cron, () => this.queue.enqueue({ name: schedule.name, payload: schedule.payload })));
    return schedule;
  }

  remove(id: string): boolean {
    const job = this.cronJobs.get(id);
    if (!job) return false;
    job.stop();
    this.cronJobs.delete(id);
    this.schedules.delete(id);
    return true;
  }

  stopAll(): void {
    for (const job of this.cronJobs.values()) job.stop();
  }
}