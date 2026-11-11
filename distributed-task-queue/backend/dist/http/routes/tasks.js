import { Router } from 'express';
import { z } from 'zod';
const allowedStatuses = ['waiting', 'active', 'completed', 'failed', 'delayed'];
const taskSchema = z.object({
    name: z.string().trim().min(1).max(120),
    payload: z.record(z.string(), z.unknown()).default({}),
    priority: z.number().int().min(-10).max(10).default(0),
    maxAttempts: z.number().int().min(1).max(10).default(3),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
    runAt: z.coerce.date().optional(),
});
export function createTaskRouter(queue, incrementEnqueued) {
    const router = Router();
    router.get('/', (req, res) => {
        const status = req.query.status;
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid task status' });
        }
        res.json(queue.list(status));
    });
    router.post('/', (req, res) => {
        const parsed = taskSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid task', details: parsed.error.flatten() });
        const result = queue.enqueue(parsed.data);
        if (!result.duplicate)
            incrementEnqueued();
        res.status(result.duplicate ? 200 : 201).json({ ...result, message: result.duplicate ? 'Existing task returned' : 'Task accepted' });
    });
    router.post('/:id/retry', (req, res) => {
        const task = queue.retry(req.params.id);
        if (!task)
            return res.status(404).json({ error: 'Failed task not found' });
        res.json(task);
    });
    return router;
}
