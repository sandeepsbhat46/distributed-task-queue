const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function processTask(task) {
    await sleep(900 + Math.random() * 900);
    if (task.payload.forceFailure === true)
        throw new Error('Simulated processor failure');
    return { accepted: true, processedAt: new Date().toISOString(), handler: task.name };
}
export function startWorkers(queue, concurrency, pollMs) {
    let stopped = false;
    const loops = Array.from({ length: concurrency }, async () => {
        while (!stopped) {
            const task = queue.claim();
            if (!task) {
                await sleep(pollMs);
                continue;
            }
            try {
                queue.complete(task.id, await processTask(task));
            }
            catch (error) {
                queue.reject(task.id, error instanceof Error ? error.message : 'Unknown worker error');
            }
        }
    });
    return () => { stopped = true; void Promise.all(loops); };
}
