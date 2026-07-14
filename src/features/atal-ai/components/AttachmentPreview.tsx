import { FileText, Image as ImageIcon, Mic2, RotateCcw, Trash2 } from 'lucide-react';
import type { AIAttachmentPayload } from '../types';

function sizeLabel(size: number) { return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }

export function AttachmentPreview({ items, onRemove, onReplace }: { items: AIAttachmentPayload[]; onRemove: (id: string) => void; onReplace: (id: string) => void }) {
  if (!items.length) return null;
  return <div className="atal-ai-attachments" aria-label="Archivos listos para enviar">{items.map((item) => <article key={item.id}>
    {item.kind === 'image' ? <button type="button" className="atal-ai-thumb" aria-label={`Ampliar ${item.name}`} onClick={() => window.open(item.data, '_blank')}><img src={item.data} alt={`Vista previa de ${item.name}`} /></button> : <span className="atal-ai-file-icon">{item.kind === 'audio' ? <Mic2 /> : <FileText />}</span>}
    <div><b>{item.name}</b><small>{item.kind === 'image' ? 'Imagen' : item.kind === 'audio' ? 'Audio' : 'PDF'} · {sizeLabel(item.size)}</small></div>
    <button type="button" title="Reemplazar" aria-label={`Reemplazar ${item.name}`} onClick={() => onReplace(item.id)}><RotateCcw /></button>
    <button type="button" title="Eliminar" aria-label={`Eliminar ${item.name}`} onClick={() => onRemove(item.id)}><Trash2 /></button>
  </article>)}</div>;
}
