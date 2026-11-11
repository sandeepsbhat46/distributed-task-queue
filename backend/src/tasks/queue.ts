import { randomUUID } from 'node:crypto';
import type { Task, TaskStatus } from './types.js';

type NewTask = Pick<Task, 'name' | 'payload'> & Partial<Pick<Task, 'priority' | 'maxAttempts' | 'idempotencyKey' | 'runAt'>>;

export class InMemoryQueue {
  private readonly tasks = new Map<string, Task>();
  private readonly idempotency = new Map<string, string>();
  private paused = false;

  enqueue(input: NewTask): { task: Task; duplicate: boolean } {
    if (input.idempotencyKey) {
      const existingId = this.idempotency.get(input.idempotencyKey);
      const existing = existingId ? this.tasks.get(existingId) : undefined;
      if (existing) return { task: existing, duplicate: true };
    }

    const now = new Date();
    const runAt = input.runAt ?? now;
    const task: Task = {
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
    if (task.idempotencyKey) this.idempotency.set(task.idempotencyKey, task.id);
    return { task, duplicate: false };
  }

  restore(task: Task): void {
    this.tasks.set(task.id, task);
    if (task.idempotencyKey) this.idempotency.set(task.idempotencyKey, task.id);
  }

  claim(): Task | undefined {
    if (this.paused) return undefined;
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.status === 'delayed' && task.runAt.getTime() <= now) this.update(task, { status: 'waiting' });
    }
    const task = [...this.tasks.values()]
      .filter((item) => item.status === 'waiting' && item.runAt.getTime() <= now)
      .sort((left, right) => right.priority - left.priority || left.createdAt.getTime() - right.createdAt.getTime())[0];
    if (!task) return undefined;
    return this.update(task, { status: 'active', attempts: task.attempts + 1, startedAt: new Date(), error: undefined });
  }

  complete(id: string, result: unknown): Task | undefined {
    return this.updateById(id, { status: 'completed', result, finishedAt: new Date(), error: undefined });
  }

  reject(id: string, error: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'active') return undefined;
    if (task.attempts < task.maxAttempts) {
      const delay = Math.min(1000 * 2 ** (task.attempts - 1), 30_000);
      return this.update(task, { status: 'delayed', error, runAt: new Date(Date.now() + delay) });
    }
    return this.update(task, { status: 'failed', error, finishedAt: new Date() });
  }

  retry(id: string): Task | undefined {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'failed') return undefined;
    return this.update(task, { status: 'waiting', attempts: 0, error: undefined, finishedAt: undefined, runAt: new Date() });
  }

  get(id: string): Task | undefined { return this.tasks.get(id); }

  list(status?: TaskStatus): Task[] {
    return [...this.tasks.values()]
      .filter((task) => !status || task.status === status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  setPaused(paused: boolean): void { this.paused = paused; }
  isPaused(): boolean { return this.paused; }

  counts(): Record<TaskStatus, number> {
    const counts: Record<TaskStatus, number> = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    for (const task of this.tasks.values()) counts[task.status] += 1;
    return counts;
  }

  private updateById(id: string, changes: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    return task ? this.update(task, changes) : undefined;
  }

  private update(task: Task, changes: Partial<Task>): Task {
    const next = { ...task, ...changes, updatedAt: new Date() };
    this.tasks.set(task.id, next);
    return next;
  }
}