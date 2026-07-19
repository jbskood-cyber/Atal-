import { useEffect, useRef } from 'react';
import { Camera, FileText, Images, ScanLine, X } from 'lucide-react';

export function AttachmentMenu({ open, onClose, onFiles }: { open: boolean; onClose: () => void; onFiles: (files: FileList) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  const pick = (ref: React.RefObject<HTMLInputElement | null>) => { onClose(); window.setTimeout(() => ref.current?.click(), 0); };
  const handle = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files?.length) onFiles(event.target.files); event.target.value = ''; };
  return <>
    <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={handle} />
    <input ref={photosRef} hidden type="file" accept="image/*" multiple onChange={handle} />
    <input ref={filesRef} hidden type="file" accept="image/*,application/pdf" multiple onChange={handle} />
    {open && <div className="atal-ai-attachment-backdrop" onMouseDown={onClose}><section className="atal-ai-attachment-menu" role="dialog" aria-modal="true" aria-label="Adjuntar a Atal IA" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><small>Agregar información</small><h2>Adjuntar a Atal IA</h2></div><button ref={closeRef} type="button" aria-label="Cerrar" onClick={onClose}><X /></button></header>
      <button type="button" onClick={() => pick(cameraRef)}><span><Camera /></span><div><b>Cámara</b></div></button>
      <button type="button" onClick={() => pick(photosRef)}><span><Images /></span><div><b>Fotos</b></div></button>
      <button type="button" onClick={() => pick(filesRef)}><span><FileText /></span><div><b>Archivo</b></div></button>
      <button type="button" onClick={() => pick(cameraRef)}><span><ScanLine /></span><div><b>Escanear archivo</b></div></button>
    </section></div>}
  </>;
}
