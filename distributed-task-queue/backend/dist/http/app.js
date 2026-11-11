import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createOverviewRouter } from './routes/overview.js';
import { createQueueRouter } from './routes/queue.js';
import { createScheduleRouter } from './routes/schedules.js';
import { createTaskRouter } from './routes/tasks.js';
export function createApp({ queue, schedules, metrics, workerCount, workerPollIntervalMs }) {
    const app = express();
    app.use(helmet());
    app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173' }));
    app.use(express.json({ limit: '32kb' }));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api') && !['GET', 'POST', 'DELETE'].includes(req.method))
            return res.sendStatus(405);
        next();
    });
    app.use('/api', createOverviewRouter(queue, schedules, workerCount, workerPollIntervalMs));
    app.use('/api/tasks', createTaskRouter(queue, metrics.incrementEnqueued));
    app.use('/api/queue', createQueueRouter(queue));
    app.use('/api/schedules', createScheduleRouter(schedules));
    app.use('/metrics', metrics.router);
    app.use((error, _req, res, _next) => {
        console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
