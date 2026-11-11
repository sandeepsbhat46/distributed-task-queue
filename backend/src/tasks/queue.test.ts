import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryQueue } from './queue.js';

test('idempotency keys return the original task without duplicating work', () => {
  const queue = new InMemoryQueue();
  const first = queue.enqueue({ name: 'email.send', payload: { to: 'a@example.com' }, idempotencyKey: 'mail-1' });
  const second = queue.enqueue({ name: 'email.send', payload: { to: 'other@example.com' }, idempotencyKey: 'mail-1' });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.task.id, first.task.id);
  assert.equal(queue.list().length, 1);
});

test('failed work is delayed for retry and eventually moves to the dead-letter state', () => {
  const queue = new InMemoryQueue();
  queue.enqueue({ name: 'report.generate', payload: {}, maxAttempts: 1 });
  const claimed = queue.claim();
  assert.ok(claimed);
  const failed = queue.reject(claimed.id, 'processor unavailable');
  assert.equal(failed?.status, 'failed');
  assert.equal(queue.counts().failed, 1);
  assert.equal(queue.retry(claimed.id)?.status, 'waiting');
  assert.equal(queue.get(claimed.id)?.attempts, 0);
});

test('paused queues do not hand tasks to workers', () => {
  const queue = new InMemoryQueue();
  queue.enqueue({ name: 'data.sync', payload: {} });
  queue.setPaused(true);
  assert.equal(queue.claim(), undefined);
  queue.setPaused(false);
  assert.equal(queue.claim()?.status, 'active');
});