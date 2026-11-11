import { useState } from 'react';
import type { FormEvent } from 'react';
import { LoaderCircle, Plus, X } from 'lucide-react';

type NewTaskData = { name: string; payload: Record<string, unknown>; idempotencyKey: string };

export function NewTaskDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (data: NewTaskData) => Promise<void> }) {
  const [name, setName] = useState('email.send');
  const [payload, setPayload] = useState('{\n  "recipient": "alex@example.com"\n}');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    let parsedPayload: unknown;
    try { parsedPayload = JSON.parse(payload); }
    catch { setError('Payload must be valid JSON.'); return; }
    if (!parsedPayload || Array.isArray(parsedPayload) || typeof parsedPayload !== 'object') { setError('Payload must be a JSON object.'); return; }
    setBusy(true);
    try { await onCreate({ name, payload: parsedPayload as Record<string, unknown>, idempotencyKey: crypto.randomUUID() }); }
    catch { setError('Task could not be added. Check the API connection and try again.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="task-modal" onSubmit={(event) => void submit(event)}><div className="modal-heading"><div><span className="modal-kicker">QUEUE ACTION</span><h2>Enqueue a task</h2></div><button type="button" className="icon-button" title="Close" onClick={onClose}><X size={18} /></button></div><label className="form-label">Task name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label><label className="form-label">Payload <small>JSON</small><textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={5} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={14} /> : <Plus size={15} />} Enqueue task</button></div></form></div>;
}