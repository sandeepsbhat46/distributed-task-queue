import { Check, CircleAlert, Clock3, Layers3, LoaderCircle } from 'lucide-react';
import type { Status } from '../../types';

export function TaskGlyph({ status }: { status: Status }) {
  const Icon = status === 'completed' ? Check : status === 'failed' ? CircleAlert : status === 'active' ? LoaderCircle : status === 'delayed' ? Clock3 : Layers3;
  return <span className={`task-glyph glyph-${status}`}><Icon size={15} /></span>;
}