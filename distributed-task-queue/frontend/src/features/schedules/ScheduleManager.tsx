import { useState } from 'react';
import type { FormEvent } from 'react';
import { Clock3, LoaderCircle, Plus, X } from 'lucide-react';
import type { Schedule } from '../../types';

export function ScheduleManager({ schedules, onClose, onCreate, onDelete }: { schedules: Schedule[]; onClose: () => void; onCreate: (data: { name: string; cron: string; payload: Record<string, unknown> }) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [name, setName] = useState('report.daily');
  const [cron, setCron] = useState('0 9 * * *');
  const [payload, setPayload] = useState('{}');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payload);
      if (!parsedPayload || Array.isArray(parsedPayload) || typeof parsedPayload !== 'object') throw new Error();
    } catch { setError('Payload must be a JSON object.'); return; }
    setBusy(true);
    try { await onCreate({ name, cron, payload: parsedPayload }); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Schedule could not be created.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="task-modal schedule-modal" aria-labelledby="schedule-title"><div className="modal-heading"><div><span className="modal-kicker">RECURRING WORK</span><h2 id="schedule-title">Schedules</h2></div><button type="button" className="icon-button" title="Close" onClick={onClose}><X size={18} /></button></div><div className="schedule-list">{schedules.length ? schedules.map((schedule) => <div className="schedule-row" key={schedule.id}><span className="schedule-row-icon"><Clock3 size={15} /></span><span className="schedule-row-copy"><b>{schedule.name}</b><code>{schedule.cron}</code></span><button className="icon-button" title={`Delete ${schedule.name}`} onClick={() => void onDelete(schedule.id)}><X size={15} /></button></div>) : <p className="schedule-empty">No recurring jobs configured.</p>}</div><form onSubmit={(event) => void submit(event)}><div className="schedule-form-title">Add recurring task</div><label className="form-label">Task name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label><label className="form-label">Cron expression<input value={cron} onChange={(event) => setCron(event.target.value)} required maxLength={100} placeholder="0 9 * * *" /><small>Minute hour day month weekday</small></label><label className="form-label">Payload <small>JSON</small><textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={3} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Close</button><button type="submit" className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={14} /> : <Plus size={15} />} Add schedule</button></div></form></section></div>;
}