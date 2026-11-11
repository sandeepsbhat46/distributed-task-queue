import { X } from 'lucide-react';
import type { Dialog } from '../../types';

type InfoDialogProps = Dialog & { onClose: () => void };

export function InfoDialog({ title, content, preformatted = false, onClose }: InfoDialogProps) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="task-modal info-modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="modal-kicker">QUEUEHOUSE</span><h2>{title}</h2></div><button className="icon-button" title="Close" onClick={onClose}><X size={18} /></button></div>{preformatted ? <pre className="info-pre">{content}</pre> : <p className="info-content">{content}</p>}<div className="modal-actions"><button className="primary-button" onClick={onClose}>Done</button></div></section></div>;
}