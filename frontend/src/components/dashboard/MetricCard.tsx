import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  tone: string;
  trend: string;
  active: boolean;
  onClick: () => void;
};

export function MetricCard({ label, value, detail, icon, tone, trend, active, onClick }: MetricCardProps) {
  return <button type="button" className={`metric-card ${active ? 'metric-selected' : ''}`} aria-pressed={active} onClick={onClick}><span className="metric-top"><span className={`metric-icon ${tone}`}>{icon}</span><span className={`metric-trend ${tone}`}>{trend}</span></span><span className="metric-value">{value.toLocaleString()}</span><span className="metric-label">{label}</span><span className="metric-bottom"><span>{detail}</span><ArrowUpRight size={13} /></span></button>;
}