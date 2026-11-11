import { Router } from 'express';
export function createQueueRouter(queue) {
    const router = Router();
    router.post('/pause', (_req, res) => { queue.setPaused(true); res.json({ paused: true }); });
    router.post('/resume', (_req, res) => { queue.setPaused(false); res.json({ paused: false }); });
    return router;
}
