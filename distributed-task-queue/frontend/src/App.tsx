import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Activity, ArrowDownToLine, ArrowUpRight, Check, ChevronDown, CircleAlert, Clock3, Download, Gauge, Layers3, LoaderCircle, MoreHorizontal, Pause, Play, Plus, RefreshCw, Search, Settings2, ShieldCheck, Timer, UserRound, X } from 'lucide-react';
import { InfoDialog } from './components/dialogs/InfoDialog';
import { MetricCard } from './components/dashboard/MetricCard';
import { StatusBadge } from './components/tasks/StatusBadge';
import { TaskGlyph } from './components/tasks/TaskGlyph';
import { MetricsDialog } from './features/metrics/MetricsDialog';
import { CsvDialog } from './features/tasks/dialogs/CsvDialog';
import { NewTaskDialog } from './features/tasks/dialogs/NewTaskDialog';
import { TaskDetailsDialog } from './features/tasks/dialogs/TaskDetailsDialog';
import { ScheduleManager } from './features/schedules/ScheduleManager';
import { api } from './lib/api';
import { ago, pretty } from './lib/format';
import { emptyOverview } from './types';
import type { Dialog, Overview, Schedule, Section, Status, Task } from './types';

function App() {
  const [overview, setOverview] = useState(emptyOverview);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [openMenu, setOpenMenu] = useState<'workspace' | 'profile' | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [metricsText, setMetricsText] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh() {
    try {
      const [nextOverview, nextTasks, nextSchedules] = await Promise.all([
        api<Overview>('/api/overview'),
        api<Task[]>(`/api/tasks${filter === 'all' ? '' : `?status=${filter}`}`),
        api<Schedule[]>('/api/schedules'),
      ]);
      setOverview(nextOverview);
      setTasks(nextTasks);
      setSchedules(nextSchedules);
    } catch { setNotice('API unavailable. Start the local development server to reconnect.'); }
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 2500); return () => window.clearInterval(timer); }, [filter]);

  async function controlQueue() {
    setBusy(true);
    try { await api(`/api/queue/${overview.paused ? 'resume' : 'pause'}`, { method: 'POST' }); await refresh(); }
    catch { setNotice('Queue action failed.'); }
    finally { setBusy(false); }
  }
  async function retry(id: string) {
    try { await api(`/api/tasks/${id}/retry`, { method: 'POST' }); setNotice('Task returned to the queue.'); await refresh(); }
    catch { setNotice('Could not retry this task.'); }
  }
  function navigate(section: Section) {
    setOpenMenu(null);
    setActiveSection(section);
    if (section === 'schedules') { setShowSchedules(true); return; }
    setShowSchedules(false);
    setFilter(section === 'failed' ? 'failed' : 'all');
  }
  function chooseFilter(next: 'all' | Status) {
    setFilter(next);
    setActiveSection(next === 'failed' ? 'failed' : 'all');
  }
  async function openInfo(title: string, endpoint: string) {
    try {
      const data = await api<Record<string, unknown>>(endpoint);
      const content = title === 'Worker settings'
        ? `Workers online: ${data.workerCount}\nPoll interval: ${data.workerPollIntervalMs} ms\nConfigure with WORKER_CONCURRENCY and WORKER_POLL_INTERVAL_MS in backend/.env, then restart the API.`
        : JSON.stringify(data, null, 2);
      setDialog({ title, content, preformatted: true });
    } catch { setNotice(`${title} information is unavailable.`); }
  }
  async function openMetrics() {
    try {
      const response = await fetch('/metrics');
      if (!response.ok) throw new Error('Metrics unavailable');
      setMetricsText(await response.text());
    } catch { setNotice('Metrics endpoint is unavailable.'); }
  }
  function exportTasks() {
    const fields = ['id', 'name', 'status', 'priority', 'attempts', 'maxAttempts', 'createdAt', 'error'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [fields.join(','), ...filtered.map((task) => fields.map((field) => escape(task[field as keyof Task])).join(','))].join('\r\n');
    setCsvPreview(csv);
    setNotice(`${filtered.length} task${filtered.length === 1 ? '' : 's'} ready to export.`);
  }
  async function copyCsv(content: string) {
    try { await navigator.clipboard.writeText(content); setNotice('CSV copied to clipboard.'); }
    catch { setNotice('Clipboard access is unavailable in this browser. Use Download CSV instead.'); }
  }
  async function copyProfileId() {
    try { await navigator.clipboard.writeText('user_sandeep_bhat_local'); setNotice('Profile ID copied.'); }
    catch { setNotice('Clipboard access is unavailable in this browser.'); }
    setOpenMenu(null);
  }
  const filtered = tasks.filter((task) => `${task.name} ${task.id} ${JSON.stringify(task.payload)}`.toLowerCase().includes(search.toLowerCase()));
  const total = Object.values(overview.counts).reduce((sum, value) => sum + value, 0);
  const completionRate = total ? Math.round(overview.counts.completed / total * 100) : 0;
  const pageTitle = activeSection === 'overview' ? 'Queue overview' : activeSection === 'failed' ? 'Dead letter queue' : activeSection === 'schedules' ? 'Schedules' : 'All tasks';

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('overview')}><span className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></span><span>queuehouse<span className="brand-period">.</span></span></button>
      <button className="workspace-switch" aria-expanded={openMenu === 'workspace'} onClick={() => setOpenMenu(openMenu === 'workspace' ? null : 'workspace')}><span className="workspace-avatar">Q</span><span className="workspace-copy"><b>Queuehouse Operations</b><small>Personal workspace</small></span><ChevronDown size={15} /></button>
      {openMenu === 'workspace' && <div className="sidebar-popover workspace-popover"><span className="popover-kicker">CURRENT WORKSPACE</span><b>Queuehouse Operations</b><span className="popover-muted">Local demo · in-memory data</span><button onClick={() => { setOpenMenu(null); setDialog({ title: 'Workspace settings', content: 'Queuehouse Operations\nEnvironment: local demo\nStorage: in-memory\nAPI: http://127.0.0.1:4000' }); }}>Workspace details <ArrowUpRight size={13} /></button></div>}
      <p className="nav-label">OPERATIONS</p>
      <nav className="nav-list">
        <button className={`nav-item ${activeSection === 'overview' ? 'selected' : ''}`} aria-current={activeSection === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}><Gauge size={17} /> Overview <span className="nav-key">⌘ 1</span></button>
        <button className={`nav-item ${activeSection === 'all' ? 'selected' : ''}`} aria-current={activeSection === 'all' ? 'page' : undefined} onClick={() => navigate('all')}><Layers3 size={17} /> All tasks <span className="nav-count">{total}</span></button>
        <button className={`nav-item ${activeSection === 'failed' ? 'selected' : ''}`} aria-current={activeSection === 'failed' ? 'page' : undefined} onClick={() => navigate('failed')}><CircleAlert size={17} /> Dead letter <span className="nav-count alert-count">{overview.counts.failed}</span></button>
        <button className={`nav-item ${activeSection === 'schedules' ? 'selected' : ''}`} aria-current={activeSection === 'schedules' ? 'page' : undefined} onClick={() => navigate('schedules')}><Clock3 size={17} /> Schedules <span className="nav-key">{overview.schedules}</span></button>
      </nav>
      <p className="nav-label queues-label">QUEUES <button className="tiny-icon" title="Add task to default queue" onClick={() => setShowNew(true)}><Plus size={14} /></button></p>
      <button className={`queue-item ${activeSection !== 'schedules' ? 'active-queue' : ''}`} onClick={() => navigate('all')}><span className="queue-dot" /> default <span className="queue-length">{overview.counts.waiting + overview.counts.active}</span></button>
      <div className="sidebar-bottom">
        <button className="system-state" onClick={() => void openInfo('System diagnostics', '/api/health')}><span className="live-dot" /><span>System operational</span><ArrowUpRight size={14} /></button>
        <button className="profile" aria-expanded={openMenu === 'profile'} onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}><span className="profile-avatar">SB</span><span><b>Sandeep Bhat</b><small>Administrator</small></span><MoreHorizontal size={17} /></button>
        {openMenu === 'profile' && <div className="sidebar-popover profile-popover"><span className="profile-menu-heading"><span className="profile-avatar">SB</span><span><b>Sandeep Bhat</b><small>Local administrator</small></span></span><button onClick={() => { setOpenMenu(null); setDialog({ title: 'Profile', content: 'Sandeep Bhat\nRole: Administrator\nAccount: Local demo user\nProfile ID: user_sandeep_bhat_local' }); }}><UserRound size={14} /> Profile details</button><button onClick={() => void copyProfileId()}><Layers3 size={14} /> Copy profile ID</button></div>}
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <b>{pageTitle}</b></div><div className="top-actions"><span className="live-indicator"><span className="live-dot" /> LIVE DATA</span><button className="icon-button" title="Refresh data" onClick={() => void refresh()}><RefreshCw size={17} /></button><button className="avatar-small" title="Profile details" onClick={() => setDialog({ title: 'Profile', content: 'Sandeep Bhat\nRole: Administrator\nAccount: Local demo user\nProfile ID: user_sandeep_bhat_local' })}>SB</button></div></header>
      <div className="content">
        <section className="page-heading"><div><div className="eyebrow">TUESDAY, NOVEMBER 11, 2026 <span className="eyebrow-line" /></div><h1>{pageTitle}</h1><p>{activeSection === 'failed' ? 'Inspect failed work and retry tasks after resolving the cause.' : 'Keep every job moving. Here\'s what\'s happening across your workers.'}</p></div><div className="heading-buttons"><button className="secondary-button" onClick={() => void openMetrics()}><Activity size={15} /> Metrics <ArrowUpRight size={13} /></button><button className="primary-button" onClick={() => setShowNew(true)}><Plus size={16} /> Add task</button></div></section>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} title="Dismiss"><X size={14} /></button></div>}
        <section className="metrics-grid" aria-label="Queue metrics">
          <MetricCard label="Waiting" value={overview.counts.waiting} detail={`${overview.counts.delayed} scheduled`} icon={<Layers3 size={17} />} tone="blue" trend="IN QUEUE" active={filter === 'waiting'} onClick={() => chooseFilter('waiting')} />
          <MetricCard label="Active tasks" value={overview.counts.active} detail={`${overview.workerCount} workers online`} icon={<Activity size={17} />} tone="green" trend={overview.paused ? 'PAUSED' : 'HEALTHY'} active={filter === 'active'} onClick={() => chooseFilter('active')} />
          <MetricCard label="Completed" value={overview.counts.completed} detail={`${completionRate}% completion rate`} icon={<Check size={17} />} tone="yellow" trend="ALL TIME" active={filter === 'completed'} onClick={() => chooseFilter('completed')} />
          <MetricCard label="Dead letter" value={overview.counts.failed} detail="Requires attention" icon={<CircleAlert size={17} />} tone="red" trend={overview.counts.failed ? 'ACTION NEEDED' : 'CLEAR'} active={filter === 'failed'} onClick={() => navigate('failed')} />
        </section>

        <section className="activity-layout">
          <div className="panel task-panel">
            <div className="panel-heading"><div><div className="panel-title-row"><h2>Recent tasks</h2><span className="live-pill"><span className="live-dot" /> STREAMING</span></div><p>Live activity from the default queue</p></div><div className="panel-controls"><button className={`control-button ${overview.paused ? 'resume-button' : ''}`} onClick={() => void controlQueue()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : overview.paused ? <Play size={15} /> : <Pause size={15} />}{overview.paused ? 'Resume' : 'Pause'} queue</button><button className="icon-button outline" title="Export visible tasks as CSV" onClick={exportTasks}><Download size={16} /></button></div></div>
            <div className="table-toolbar"><div className="tabs">{(['all', 'active', 'waiting', 'completed', 'failed'] as const).map((item) => <button key={item} className={filter === item ? 'tab active-tab' : 'tab'} aria-pressed={filter === item} onClick={() => chooseFilter(item)}>{item === 'all' ? 'All tasks' : item === 'failed' ? 'Failed' : item[0].toUpperCase() + item.slice(1)}{item === 'failed' && overview.counts.failed > 0 && <span className="tab-badge">{overview.counts.failed}</span>}</button>)}</div><label className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /></label></div>
            <div className="table-wrap"><table><thead><tr><th>TASK</th><th>STATUS</th><th>ATTEMPTS</th><th>CREATED</th><th></th></tr></thead><tbody>
              {filtered.map((task) => <tr key={task.id}><td><div className="task-name"><TaskGlyph status={task.status} /><span><b>{pretty(task.name)}</b><small>{task.id.slice(0, 13)}</small></span></div></td><td><StatusBadge status={task.status} /></td><td><span className={task.status === 'failed' ? 'attempts danger-text' : 'attempts'}>{task.attempts}<span> / {task.maxAttempts}</span></span></td><td className="time-cell">{ago(task.createdAt)}</td><td className="row-action"><div className="row-actions"><button className="icon-button row-more" title="Task details" onClick={() => setSelectedTask(task)}><MoreHorizontal size={16} /></button>{task.status === 'failed' && <button className="retry-button" onClick={() => void retry(task.id)} title="Retry task"><RefreshCw size={14} /> Retry</button>}</div></td></tr>)}
              {!filtered.length && <tr><td className="empty-cell" colSpan={5}>No tasks match this view.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing <b>{filtered.length}</b> of <b>{tasks.length}</b> tasks</span><button onClick={() => navigate('all')}>View all tasks <ArrowUpRight size={13} /></button></div>
          </div>

          <aside className="side-panels">
            <div className="panel workers-panel"><div className="side-title"><div><h2>Worker health</h2><p>Current processing capacity</p></div><button className="icon-button" title="Worker settings" onClick={() => void openInfo('Worker settings', '/api/health')}><Settings2 size={16} /></button></div><div className="worker-number"><b>{overview.workerCount}</b><span>workers online</span><span className="worker-status"><span className="live-dot" /> All healthy</span></div><div className="worker-meter">{Array.from({ length: Math.min(overview.workerCount, 8) }, (_, index) => <span key={index} className={index < overview.counts.active ? 'meter-active' : ''} />)}</div><div className="worker-meta"><span>Concurrency</span><b>{overview.workerCount} slots</b></div><div className="worker-meta"><span>Avg. processing time</span><b><Timer size={13} /> {overview.avgDurationMs ? `${(overview.avgDurationMs / 1000).toFixed(1)}s` : '—'}</b></div></div>
            <div className="panel reliability-panel"><div className="side-title"><div><h2>Reliability</h2><p>Queue delivery performance</p></div><ShieldCheck size={17} className="shield-icon" /></div><div className="reliability-score"><b>{completionRate}<small>%</small></b><span>successful<br />completion</span><div className="donut" style={{ '--progress': `${completionRate}%` } as React.CSSProperties}><span><Check size={16} /></span></div></div><div className="reliability-note"><span><ArrowDownToLine size={14} /> At-least-once delivery</span><span><Check size={14} /> Idempotent enqueue keys</span></div></div>
            <button className="panel schedule-panel" onClick={() => navigate('schedules')}><span className="schedule-icon"><Clock3 size={16} /></span><span className="schedule-summary"><h2>Schedules</h2><p>{overview.schedules ? `${overview.schedules} recurring job${overview.schedules === 1 ? '' : 's'} configured` : 'No recurring jobs yet'}</p></span><ArrowUpRight size={15} /></button>
          </aside>
        </section>
        <footer className="page-footer"><span>QUEUEHOUSE <span className="footer-separator">/</span> LOCAL DEVELOPMENT</span><span><span className="live-dot" /> In-memory test mode <span className="footer-separator">·</span> No database connection</span></footer>
      </div>
    </main>
  {showNew && <NewTaskDialog onClose={() => setShowNew(false)} onCreate={async (data) => { await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) }); setNotice('Task added to the queue.'); setShowNew(false); setSearch(''); setActiveSection('all'); if (filter === 'all') await refresh(); else setFilter('all'); }} />}
    {showSchedules && <ScheduleManager schedules={schedules} onClose={() => { setShowSchedules(false); setActiveSection('overview'); }} onCreate={async (data) => { await api('/api/schedules', { method: 'POST', body: JSON.stringify(data) }); await refresh(); }} onDelete={async (id) => { await api(`/api/schedules/${id}`, { method: 'DELETE' }); await refresh(); }} />}
    {dialog && <InfoDialog title={dialog.title} content={dialog.content} preformatted={dialog.preformatted} onClose={() => setDialog(null)} />}
    {metricsText !== null && <MetricsDialog text={metricsText} onRefresh={() => void openMetrics()} onClose={() => setMetricsText(null)} />}
    {csvPreview !== null && <CsvDialog content={csvPreview} onCopy={() => void copyCsv(csvPreview)} onClose={() => setCsvPreview(null)} />}
    {selectedTask && <TaskDetailsDialog task={selectedTask} onClose={() => setSelectedTask(null)} onRetry={() => { void retry(selectedTask.id); setSelectedTask(null); }} />}
  </div>;
}

export default App;