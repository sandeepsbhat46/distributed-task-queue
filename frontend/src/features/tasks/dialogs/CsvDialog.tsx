import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function CsvDialog({ content, onCopy, onClose }: { content: string; onCopy: () => void; onClose: () => void }) {
  const [downloadUrl, setDownloadUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [content]);
  const rowCount = Math.max(0, content.split('\r\n').length - 1);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="task-modal metrics-modal" role="dialog" aria-modal="true" aria-label="Export tasks"><div className="modal-heading"><div><span className="modal-kicker">CSV EXPORT · {rowCount} TASKS</span><h2>Export tasks</h2></div><button className="icon-button" title="Close" onClick={onClose}><X size={18} /></button></div><pre className="metrics-output csv-output">{content}</pre><div className="modal-actions"><button className="secondary-button" onClick={onCopy}>Copy CSV</button><a className="primary-button" href={downloadUrl} download="queuehouse-tasks.csv"><Download size={14} /> Download CSV</a></div></section></div>;
}