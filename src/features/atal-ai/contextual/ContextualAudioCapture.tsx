'use client';

import { LoaderCircle, Mic, X } from 'lucide-react';
import { useState } from 'react';
import { requestAtalAI } from '../api/geminiClient';
import { AudioRecorder } from '../components/AudioRecorder';
import type { AIAttachmentPayload } from '../types';

const uid = () => `contextual-audio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function fileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No pudimos leer el audio.'));
    reader.readAsDataURL(file);
  });
}

export function ContextualAudioCapture({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [transcribing, setTranscribing] = useState(false);

  const close = () => {
    if (transcribing) return;
    setOpen(false);
    setFile(null);
    setMessage('');
  };

  const transcribe = async () => {
    if (!file) return;
    setTranscribing(true);
    setMessage('Transcribiendo audio…');
    try {
      const attachment: AIAttachmentPayload = {
        id: uid(),
        name: file.name,
        type: file.type || 'audio/webm',
        size: file.size,
        kind: 'audio',
        available: true,
        data: await fileData(file),
      };
      const result = await requestAtalAI({ mode: 'transcribe', text: '', attachments: [attachment] });
      const transcript = result.transcript?.trim() ?? '';
      if (!transcript) throw new Error('La transcripción llegó vacía.');
      onTranscript(transcript);
      close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos transcribir el audio.');
    } finally {
      setTranscribing(false);
    }
  };

  return <>
    <button type="button" className="is-mic" aria-label="Grabar audio" onClick={() => setOpen(true)}><Mic /></button>
    {open && <div className="atal-contextual-audio-layer" role="dialog" aria-modal="true" aria-label="Nota de voz contextual">
      <section>
        <header><div><Mic /><span><b>Nota de voz</b><small>Graba y revisa la transcripción antes de enviarla</small></span></div><button type="button" aria-label="Cerrar nota de voz" onClick={close}><X /></button></header>
        <AudioRecorder
          onReady={(next) => { setFile(next); setMessage('Audio listo para transcribir.'); }}
          onState={(_state, nextMessage) => { if (nextMessage) setMessage(nextMessage); }}
        />
        {message && <p role="status">{message}</p>}
        {file && <button type="button" className="atal-contextual-transcribe" disabled={transcribing} onClick={() => void transcribe()}>{transcribing ? <LoaderCircle className="is-spinning" /> : <Mic />}Transcribir audio</button>}
      </section>
    </div>}
  </>;
}
