import { randomUUID } from 'node:crypto';
export class InMemoryQueue {
    tasks = new Map();
    idempotency = new Map();
    paused = false;
    enqueue(input) {
        if (input.idempotencyKey) {
            const existingId = this.idempotency.get(input.idempotencyKey);
            const existing = existingId ? this.tasks.get(existingId) : undefined;
            if (existing)
                return { task: existing, duplicate: true };
        }
        const now = new Date();
        const runAt = input.runAt ?? now;
        const task = {
            id: randomUUID(),
            name: input.name,
            payload: input.payload,
            status: runAt > now ? 'delayed' : 'waiting',
            priority: input.priority ?? 0,
            attempts: 0,
            maxAttempts: input.maxAttempts ?? 3,
            idempotencyKey: input.idempotencyKey,
            runAt,
            createdAt: now,
            updatedAt: now,
        };
        this.tasks.set(task.id, task);
        if (task.idempotencyKey)
            this.idempotency.set(task.idempotencyKey, task.id);
        return { task, duplicate: false };
    }
    restore(task) {
        this.tasks.set(task.id, task);
        if (task.idempotencyKey)
            this.idempotency.set(task.idempotencyKey, task.id);
    }
    claim() {
        if (this.paused)
            return undefined;
        const now = Date.now();
        for (const task of this.tasks.values()) {
            if (task.status === 'delayed' && task.runAt.getTime() <= now)
                this.update(task, { status: 'waiting' });
        }
        const task = [...this.tasks.values()]
            .filter((item) => item.status === 'waiting' && item.runAt.getTime() <= now)
            .sort((left, right) => right.priority - left.priority || left.createdAt.getTime() - right.createdAt.getTime())[0];
        if (!task)
            return undefined;
        return this.update(task, { status: 'active', attempts: task.attempts + 1, startedAt: new Date(), error: undefined });
    }
    complete(id, result) {
        return this.updateById(id, { status: 'completed', result, finishedAt: new Date(), error: undefined });
    }
    reject(id, error) {
        const task = this.tasks.get(id);
        if (!task || task.status !== 'active')
            return undefined;
        if (task.attempts < task.maxAttempts) {
            const delay = Math.min(1000 * 2 ** (task.attempts - 1), 30_000);
            return this.update(task, { status: 'delayed', error, runAt: new Date(Date.now() + delay) });
        }
        return this.update(task, { status: 'failed', error, finishedAt: new Date() });
    }
    retry(id) {
        const task = this.tasks.get(id);
        if (!task || task.status !== 'failed')
            return undefined;
        return this.update(task, { status: 'waiting', attempts: 0, error: undefined, finishedAt: undefined, runAt: new Date() });
    }
    get(id) { return this.tasks.get(id); }
    list(status) {
        return [...this.tasks.values()]
            .filter((task) => !status || task.status === status)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    }
    setPaused(paused) { this.paused = paused; }
    isPaused() { return this.paused; }
    counts() {
        const counts = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        for (const task of this.tasks.values())
            counts[task.status] += 1;
        return counts;
    }
    updateById(id, changes) {
        const task = this.tasks.get(id);
        return task ? this.update(task, changes) : undefined;
    }
    update(task, changes) {
        const next = { ...task, ...changes, updatedAt: new Date() };
        this.tasks.set(task.id, next);
        return next;
    }
}
