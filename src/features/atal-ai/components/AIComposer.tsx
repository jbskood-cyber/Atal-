import { LoaderCircle, Mic, Plus, Send, Square } from 'lucide-react';
import { FormEvent, KeyboardEvent, RefObject, useEffect } from 'react';

export function AIComposer({ textareaRef,value,hasReadyContent,processing,recording,onChange,onAttach,onSend,onMicrophone,onCancelProcessing }: { textareaRef:RefObject<HTMLTextAreaElement|null>;value:string;hasReadyContent:boolean;processing:boolean;recording:boolean;onChange:(value:string)=>void;onAttach:()=>void;onSend:()=>void;onMicrophone:()=>void;onCancelProcessing:()=>void }) {
  useEffect(() => {
    const textarea=textareaRef.current;if(!textarea)return;
    textarea.style.height='0px';
    textarea.style.height=`${Math.min(128,Math.max(24,textarea.scrollHeight))}px`;
  },[value,textareaRef]);
  const submit=(event:FormEvent)=>{event.preventDefault();if(hasReadyContent&&!processing)onSend()};
  const keyboard=(event:KeyboardEvent<HTMLTextAreaElement>)=>{if(event.key==='Enter'&&!event.shiftKey&&window.innerWidth>=768){event.preventDefault();if(hasReadyContent&&!processing)onSend()}};
  return <form className="atal-command-composer" onSubmit={submit}>
    <button type="button" className="atal-command-attach" aria-label="Adjuntar cámara o foto" onClick={onAttach}><Plus/></button>
    <textarea ref={textareaRef} rows={1} value={value} onChange={(event)=>onChange(event.target.value)} onKeyDown={keyboard} placeholder="Escribe un mensaje…" aria-label="Mensaje para Atal IA"/>
    {processing ? <button type="button" className="atal-command-dynamic is-processing" aria-label="Cancelar procesamiento" onClick={onCancelProcessing}><LoaderCircle className="is-spinning"/><Square/></button> : hasReadyContent ? <button type="submit" className="atal-command-dynamic is-send" aria-label="Enviar mensaje"><Send/></button> : <button type="button" className={`atal-command-dynamic is-mic${recording?' is-recording':''}`} aria-label={recording?'Pausar o continuar grabación':'Grabar audio'} onClick={onMicrophone}><Mic/><span className="sr-only">{recording?'Grabando':'Micrófono'}</span></button>}
  </form>;
}
