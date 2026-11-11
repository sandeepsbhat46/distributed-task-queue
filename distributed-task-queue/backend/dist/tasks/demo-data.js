const ago = (seconds) => new Date(Date.now() - seconds * 1000);
export function createDemoTasks() {
    return [
        { id: 'demo-1', name: 'email.send', payload: { recipient: 'ops@queuehouse.dev', template: 'weekly-digest' }, status: 'completed', priority: 2, attempts: 1, maxAttempts: 3, result: { messageId: 'msg_7f29' }, runAt: ago(540), startedAt: ago(539), finishedAt: ago(537), createdAt: ago(540), updatedAt: ago(537) },
        { id: 'demo-2', name: 'report.generate', payload: { report: 'revenue', format: 'csv' }, status: 'completed', priority: 1, attempts: 1, maxAttempts: 3, result: { rows: 1842 }, runAt: ago(410), startedAt: ago(409), finishedAt: ago(405), createdAt: ago(410), updatedAt: ago(405) },
        { id: 'demo-3', name: 'webhook.deliver', payload: { endpoint: 'https://hooks.acme.dev/events' }, status: 'failed', priority: 0, attempts: 3, maxAttempts: 3, error: 'HTTP 503: upstream service unavailable', runAt: ago(280), startedAt: ago(278), finishedAt: ago(240), createdAt: ago(280), updatedAt: ago(240) },
        { id: 'demo-4', name: 'image.optimize', payload: { assetId: 'asset_8291', width: 1200 }, status: 'waiting', priority: 3, attempts: 0, maxAttempts: 4, runAt: ago(20), createdAt: ago(20), updatedAt: ago(20) },
        { id: 'demo-5', name: 'search.reindex', payload: { collection: 'products', batch: 12 }, status: 'waiting', priority: 1, attempts: 0, maxAttempts: 3, runAt: ago(12), createdAt: ago(12), updatedAt: ago(12) },
        { id: 'demo-6', name: 'billing.reconcile', payload: { tenantId: 'tn_4a82' }, status: 'delayed', priority: 2, attempts: 1, maxAttempts: 3, error: 'Temporary rate limit', runAt: new Date(Date.now() + 120_000), createdAt: ago(6), updatedAt: ago(6) },
    ];
}
export function demoStatusCounts(tasks) {
    return tasks.reduce((counts, task) => ({ ...counts, [task.status]: counts[task.status] + 1 }), {
        waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0,
    });
}
