# Backend

The backend is the API and runtime for Queuehouse. It runs the Express routes, keeps the queue and schedules in memory, starts worker loops, and exposes Prometheus metrics. The UI reaches it through Vite's development proxy; the browser does not connect to the queue directly.

## Start and build

Run these commands from the repository root:

```powershell
npm run dev:backend
npm run build --workspace backend
npm test
```

The API binds to `127.0.0.1:4000` by default. `npm run dev` at the root starts the backend and frontend together. The backend package uses TypeScript, `tsx` for development and tests, Express for HTTP, Zod for request validation, `node-cron` for recurring schedules, and `prom-client` for metrics.

## Startup

`src/server.ts` is the entry point. On startup it loads environment variables, creates one `InMemoryQueue`, restores the demo tasks, prepares the metrics registry, starts the worker loops, and begins listening for HTTP requests. The queue, scheduler, and workers all live in this same Node process.

The main files are:

- `src/server.ts`: process startup, demo seeding, workers, and graceful shutdown.
- `src/http/app.ts`: Express middleware and route composition.
- `src/http/routes/overview.ts`: health and dashboard summary endpoints.
- `src/http/routes/tasks.ts`: task listing, enqueue, validation, and retry endpoints.
- `src/http/routes/queue.ts`: pause and resume endpoints.
- `src/http/routes/schedules.ts`: schedule CRUD endpoints.
- `src/http/app.ts`: mounts route modules and applies shared middleware.
- `src/schedules/manager.ts`: in-memory schedule records and cron job lifecycle.
- `src/metrics/queue-metrics.ts`: Prometheus registry and queue metrics endpoint.
- `src/tasks/queue.ts`: task storage and state transitions.
- `src/workers/worker.ts`: worker polling and the sample task processor.
- `src/tasks/types.ts`: task and schedule shapes shared by backend modules.
- `src/tasks/demo-data.ts`: tasks loaded at every startup.
- `src/tasks/queue.test.ts`: tests for idempotency, retries, and pausing.
- `prisma/schema.prisma`: a future PostgreSQL model; it is not used by the running API.

Keep task state changes in `src/tasks/queue.ts`, request handling in the matching `src/http/routes/` module, and worker behavior in `src/workers/`. `server.ts` should stay focused on starting and stopping the process.

## Task lifecycle

The API accepts a JSON object payload and validates the request before calling `InMemoryQueue.enqueue`. The queue assigns an ID and timestamps. A task is `waiting` when it can run now, or `delayed` when its `runAt` time is in the future. If the supplied idempotency key already belongs to a task in this process, the API returns that task instead of adding a duplicate.

Workers poll the shared queue. `claim()` moves due delayed tasks back to waiting, then claims the highest-priority eligible task; older tasks win ties. Claiming increments the attempt count and marks the task active. The example processor waits roughly one to two seconds and returns a small result. For testing, `payload.forceFailure: true` makes it throw.

A failure is retried after exponential backoff, capped at 30 seconds. Once the number of attempts reaches `maxAttempts`, the task becomes `failed` and appears in the dead-letter view. The manual retry route returns a failed task to waiting and resets its attempt counter. This queue is intentionally simple: it has no durable leases, persistence, or cross-process coordination.

Pausing the queue blocks new claims; it does not cancel work already claimed. Resuming lets workers claim tasks again.

## HTTP API

All task and schedule payloads must be JSON objects. The API limits JSON request bodies to 32 KB. Invalid task or schedule input returns HTTP 400 with a short error and validation details.

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/health` | Returns `status`, storage mode, database connection flag, worker count, and poll interval. |
| `GET` | `/api/overview` | Returns task counts, pause state, worker count, average completed-task duration, recent tasks, and schedule count. |
| `GET` | `/api/tasks` | Lists tasks newest first. The optional `status` query accepts `waiting`, `active`, `completed`, `failed`, or `delayed`. |
| `POST` | `/api/tasks` | Validates and enqueues a task. Returns 201 for new work and 200 when an idempotency key matches existing work. |
| `POST` | `/api/tasks/:id/retry` | Retries a failed task; returns 404 if the task is not in the failed state. |
| `POST` | `/api/queue/pause` | Stops workers from claiming new tasks. |
| `POST` | `/api/queue/resume` | Re-enables task claims. |
| `GET` | `/api/schedules` | Lists in-memory recurring schedules. |
| `POST` | `/api/schedules` | Validates and registers a cron schedule. |
| `DELETE` | `/api/schedules/:id` | Stops and removes a registered schedule; returns 404 if it does not exist. |
| `GET` | `/metrics` | Renders default Node metrics and queue metrics in Prometheus format. |

A task request can include `name`, `payload`, `priority` from -10 to 10, `maxAttempts` from 1 to 10, `idempotencyKey`, and an optional `runAt` date. For example:

```json
{
  "name": "report.daily",
  "payload": { "format": "csv" },
  "priority": 1,
  "maxAttempts": 3,
  "idempotencyKey": "daily-report-2026-11-11"
}
```

A schedule request uses `name`, a cron expression, and `payload`:

```json
{
  "name": "report.daily",
  "cron": "0 9 * * *",
  "payload": { "format": "csv" }
}
```

## Workers, schedules, and metrics

`WORKER_CONCURRENCY` sets the number of worker loops. It defaults to 3 and is clamped between 1 and 16. `WORKER_POLL_INTERVAL_MS` controls how long an idle worker waits before checking again; it defaults to 500 ms and has a 100 ms minimum. A worker handles one task at a time.

Schedules are registered with `node-cron`. When a cron callback fires it enqueues a regular task, so the worker path and retry behavior remain the same. Both schedule definitions and cron jobs are held in memory and disappear at restart.

The queue metrics are:

- `task_queue_waiting`: waiting and delayed tasks combined.
- `task_queue_active`: currently claimed tasks.
- `task_queue_completed`: completed tasks.
- `task_queue_dead_letter`: failed tasks.
- `task_queue_enqueued_total`: accepted non-duplicate enqueues.

The gauges refresh when `/metrics` is scraped. The registry also includes default Node.js process metrics.

## Configuration and safety

The API reads `PORT`, `WEB_ORIGIN`, `WORKER_CONCURRENCY`, and `WORKER_POLL_INTERVAL_MS`. Defaults are port 4000, frontend origin `http://127.0.0.1:5173`, 3 workers, and a 500 ms poll interval. It uses Helmet, allows the configured web origin through CORS, and binds to loopback. There is no authentication or authorization, so keep this demo local.

PostgreSQL is not connected. The Prisma schema is a starting point for a future persistence adapter; `DATABASE_URL` is required by Prisma when validating that schema, but validation does not open a database connection. Copy `.env.example` to `.env` to supply the placeholder URL. The running API does not import Prisma, Redis, or a database client. Restarting the process clears tasks and schedules.

`npm test` runs the built-in Node test runner through `tsx`. The current tests cover duplicate idempotency keys, dead-letter/retry behavior, and pause/resume claim behavior. `npm run db:validate` validates the Prisma schema; it does not migrate or connect to a database.
