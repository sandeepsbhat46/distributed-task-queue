import { Router } from 'express';
import cron from 'node-cron';
import { z } from 'zod';
const scheduleSchema = z.object({
    name: z.string().trim().min(1).max(120),
    cron: z.string().min(1).max(100).refine(cron.validate, 'Invalid cron expression'),
    payload: z.record(z.string(), z.unknown()).default({}),
});
export function createScheduleRouter(schedules) {
    const router = Router();
    router.get('/', (_req, res) => res.json(schedules.list()));
    router.post('/', (req, res) => {
        const parsed = scheduleSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid schedule', details: parsed.error.flatten() });
        res.status(201).json(schedules.create(parsed.data));
    });
    router.delete('/:id', (req, res) => {
        if (!schedules.remove(req.params.id))
            return res.status(404).json({ error: 'Schedule not found' });
        res.sendStatus(204);
    });
    return router;
}
