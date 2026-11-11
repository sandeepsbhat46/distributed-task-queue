import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
export class ScheduleManager {
    queue;
    schedules = new Map();
    cronJobs = new Map();
    constructor(queue) {
        this.queue = queue;
    }
    list() {
        return [...this.schedules.values()];
    }
    create(input) {
        const schedule = { ...input, id: randomUUID(), enabled: true, nextRunAt: new Date(Date.now() + 60_000) };
        this.schedules.set(schedule.id, schedule);
        this.cronJobs.set(schedule.id, cron.schedule(schedule.cron, () => this.queue.enqueue({ name: schedule.name, payload: schedule.payload })));
        return schedule;
    }
    remove(id) {
        const job = this.cronJobs.get(id);
        if (!job)
            return false;
        job.stop();
        this.cronJobs.delete(id);
        this.schedules.delete(id);
        return true;
    }
    stopAll() {
        for (const job of this.cronJobs.values())
            job.stop();
    }
}
