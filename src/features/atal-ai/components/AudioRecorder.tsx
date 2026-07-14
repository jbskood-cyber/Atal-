import { useEffect, useRef, useState } from 'react';
import { CircleStop, Mic, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';

function clock(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export function AudioRecorder({ onReady, onState }: { onReady: (file: File) => void; onState: (state: 'idle'|'recording'|'paused'|'ready'|'error', message?: string) => void }) {
  const [state, setState] = useState<'idle'|'recording'|'paused'|'ready'|'error'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const update = (next: typeof state, message?: string) => { setState(next); onState(next, message); };
  useEffect(() => { if (state !== 'recording') return; const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); }, [state]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return update('error', 'El micrófono no está disponible en este navegador.');
    try {
      cancelledRef.current = false;
      if (url) { URL.revokeObjectURL(url); setUrl(''); }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = []; setSeconds(0);
      const recorder = new MediaRecorder(stream); recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelledRef.current) { chunksRef.current = []; return; }
        const audioType = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type: audioType });
        if (!blob.size) return update('error', 'La grabación quedó vacía. Vuelve a intentarlo.');
        const nextUrl = URL.createObjectURL(blob); setUrl(nextUrl);
        onReady(new File([blob], `nota-clinica-${Date.now()}.webm`, { type: blob.type })); update('ready');
      };
      recorder.start(); update('recording');
    } catch (error) { update('error', error instanceof DOMException && error.name === 'NotAllowedError' ? 'Permiso de micrófono rechazado. Puedes habilitarlo en el navegador.' : 'No pudimos iniciar la grabación.'); }
  };
  const pause = () => { recorderRef.current?.pause(); update('paused'); };
  const resume = () => { recorderRef.current?.resume(); update('recording'); };
  const finish = () => recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop();
  const reset = () => { cancelledRef.current = true; if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); streamRef.current?.getTracks().forEach((track) => track.stop()); if (url) URL.revokeObjectURL(url); setUrl(''); setSeconds(0); chunksRef.current = []; update('idle'); };

  if (state === 'idle') return <button type="button" className="atal-ai-record-trigger" onClick={start}><Mic /> Grabar nota de voz</button>;
  return <section className={`atal-ai-recorder is-${state}`} aria-live="polite"><div><span className="atal-ai-record-dot" /><div><b>{state === 'recording' ? 'Grabando' : state === 'paused' ? 'Grabación pausada' : state === 'ready' ? 'Audio listo' : 'No pudimos grabar'}</b><small>{clock(seconds)}</small></div></div>
    {url && <audio controls src={url}>Tu navegador no puede reproducir este audio.</audio>}
    {state === 'recording' && <><button type="button" onClick={pause}><Pause /> Pausar</button><button type="button" onClick={finish}><CircleStop /> Finalizar</button><button type="button" onClick={reset}><Trash2 /> Cancelar</button></>}
    {state === 'paused' && <><button type="button" onClick={resume}><Play /> Continuar</button><button type="button" onClick={finish}><CircleStop /> Finalizar</button><button type="button" onClick={reset}><Trash2 /> Cancelar</button></>}
    {state === 'ready' && <><button type="button" onClick={start}><RotateCcw /> Volver a grabar</button><button type="button" onClick={reset}><Trash2 /> Eliminar</button></>}
    {state === 'error' && <button type="button" onClick={start}><RotateCcw /> Reintentar</button>}
  </section>;
}
