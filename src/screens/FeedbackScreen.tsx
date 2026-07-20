'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Check, Download, ImagePlus, MessageSquareText, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { AppSelect } from '@/src/components/atal/AppSelect';
import { addFeedback, updateFeedbackStatus, useAtalStore } from '@/src/data/atalStore';

const categories = ['Reportar un error', 'Proponer una mejora', 'Solicitar una función', 'Diseño y experiencia', 'Otro comentario'];
const statusLabels = { prepared: 'Preparado', shared: 'Compartido', downloaded: 'Descargado', copied: 'Copiado' } as const;

function buildText(input: { category: string; title: string; description: string; screen: string; email: string }) {
  return `Comentario para Atal\n\nCategoría: ${input.category}\nTítulo: ${input.title}\nDescripción: ${input.description}\nPantalla: ${input.screen}\nCorreo de contacto: ${input.email || 'No proporcionado'}`;
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FeedbackScreen() {
  const router = useRouter();
  const history = useAtalStore((state) => state.feedback);
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    const screen = location.pathname;
    const item = addFeedback({
      category,
      title: title.trim(),
      description: description.trim(),
      screen,
      appVersion: '0.1.0',
      device: navigator.userAgent,
      email: email.trim(),
      contactAllowed: Boolean(email.trim()),
      screenshotName: file?.name,
      status: 'prepared',
    });
    const text = buildText({ category, title: title.trim(), description: description.trim(), screen, email: email.trim() });

    try {
      if (navigator.share && (!file || !navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: `Atal: ${title.trim()}`, text, files: file ? [file] : undefined });
        updateFeedbackStatus(item.id, 'shared');
        setMessage('Comentario compartido.');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        updateFeedbackStatus(item.id, 'copied');
        setMessage('Comentario copiado. Puedes pegarlo en el canal que prefieras.');
      } else {
        downloadText(`atal-comentario-${item.id}.txt`, text);
        updateFeedbackStatus(item.id, 'downloaded');
        setMessage('Comentario preparado para compartir.');
      }
      setTitle('');
      setDescription('');
      setFile(null);
    } catch {
      setMessage('No se compartió el comentario. Puedes intentarlo de nuevo.');
    }
  };

  return (
    <AtalShell>
      <main className="atal-content atal-flow-page atal-feedback-page">
        <div className="atal-flow-topbar">
          <button type="button" onClick={() => router.back()}><ArrowLeft /></button>
          <span>Ayuda y comentarios</span>
          <i />
        </div>
        <div className="atal-form-heading">
          <h1>Cuéntanos qué necesitas</h1>
          <p>Comparte una duda, un error o una idea para mejorar Atal.</p>
        </div>
        <form className="atal-clinical-form" onSubmit={submit}>
          <fieldset>
            <label className="atal-field"><span>Categoría</span><AppSelect label="Categoría del comentario" value={category} options={categories} onChange={setCategory} /></label>
            <label className="atal-field"><span>Título</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resumen breve" /></label>
            <label className="atal-field"><span>Descripción</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explica qué pasó o qué te gustaría mejorar…" /></label>
            <label className="atal-field"><span>Correo de contacto</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Opcional" /></label>
            <label className="atal-feedback-file">
              <ImagePlus />
              <span><b>{file?.name ?? 'Adjuntar captura'}</b><small>PNG o JPG · máximo 5 MB</small></span>
              <input type="file" accept="image/*" onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected && selected.size <= 5 * 1024 * 1024) {
                  setFile(selected);
                  setMessage('');
                } else if (selected) setMessage('La captura supera 5 MB.');
              }} />
            </label>
          </fieldset>
          <button type="submit" className="atal-submit-button" disabled={!title.trim() || !description.trim()}><Send />Compartir comentario</button>
        </form>
        {message && <p className="atal-action-message" role="status"><Check />{message}</p>}
        <section className="atal-profile-section atal-feedback-history">
          <h2>Comentarios recientes</h2>
          <div className="atal-note-history">
            {history.map((item) => <article key={item.id}><MessageSquareText /><div><b>{item.title}</b><p>{item.category} · {statusLabels[item.status]}</p><small>{new Date(item.createdAt).toLocaleString('es-MX')}</small></div><button type="button" onClick={() => downloadText(`atal-comentario-${item.id}.txt`, buildText(item))}><Download />Descargar</button></article>)}
            {!history.length && <p>Aún no has compartido comentarios.</p>}
          </div>
        </section>
      </main>
    </AtalShell>
  );
}
