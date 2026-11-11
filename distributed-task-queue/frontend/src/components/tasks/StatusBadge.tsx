import type { Status } from '../../types';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-${status}`}><span />{status === 'failed' ? 'Dead letter' : status[0].toUpperCase() + status.slice(1)}</span>;
}