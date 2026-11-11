export type TaskStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface Task {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  result?: unknown;
  error?: string;
  runAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  payload: Record<string, unknown>;
  enabled: boolean;
  nextRunAt: Date;
}