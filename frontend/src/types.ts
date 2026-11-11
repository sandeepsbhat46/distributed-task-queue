export type Status = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
export type Task = { id: string; name: string; payload: Record<string, unknown>; status: Status; priority: number; attempts: number; maxAttempts: number; error?: string; result?: unknown; createdAt: string; finishedAt?: string };
export type Overview = { counts: Record<Status, number>; paused: boolean; workerCount: number; avgDurationMs: number; recent: Task[]; schedules: number };
export type Schedule = { id: string; name: string; cron: string; payload: Record<string, unknown> };
export type Section = 'overview' | 'all' | 'failed' | 'schedules';
export type Dialog = { title: string; content: string; preformatted?: boolean };

export const emptyOverview: Overview = { counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }, paused: false, workerCount: 0, avgDurationMs: 0, recent: [], schedules: 0 };