'use client';

import { FormEvent, useState } from 'react';
import { ArrowUp, ClipboardList, Sparkles, Stethoscope, WandSparkles } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';

type Message = { role: 'assistant' | 'user'; text: string };

export function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: 'Hola. Puedo ayudarte a preparar un plan, revisar el progreso o encontrar un ejercicio.' }]);
  const [value, setValue] = useState('');
  const send = (event: FormEvent) => { event.preventDefault(); const text = value.trim(); if (!text) return; setMessages((current) => [...current, { role: 'user', text }, { role: 'assistant', text: 'Preparé una propuesta local con los datos demostrativos. Cuando conectemos Gemini, podré convertirla en una acción clínica completa.' }]); setValue(''); };
  const prompt = (text: string) => { setValue(text); };
  return <AtalShell><main className="atal-content atal-flow-page atal-assistant-page"><header><span><Sparkles /></span><div><small>Asistente clínico</small><h1>Atal IA</h1></div><i>Demo local</i></header><section className="atal-assistant-thread">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`atal-message is-${message.role}`}>{message.role === 'assistant' && <span><Sparkles /></span>}<p>{message.text}</p></div>)}</section>{messages.length === 1 && <div className="atal-assistant-prompts"><button type="button" onClick={() => prompt('Crea un plan inicial para dolor de rodilla')}><ClipboardList /><span><b>Crear un plan</b><small>Desde diagnóstico y objetivos</small></span></button><button type="button" onClick={() => prompt('Resume el progreso de Paciente Demo 01')}><Stethoscope /><span><b>Revisar progreso</b><small>Detecta alertas clínicas</small></span></button><button type="button" onClick={() => prompt('Sugiere ejercicios de movilidad de cadera')}><WandSparkles /><span><b>Sugerir ejercicios</b><small>Según región y objetivo</small></span></button></div>}<form onSubmit={send} className="atal-assistant-composer"><textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Pregúntale algo a Atal…" rows={1} /><button type="submit" disabled={!value.trim()}><ArrowUp /></button></form><small className="atal-assistant-disclaimer">Atal IA puede cometer errores. Confirma siempre la información clínica.</small></main></AtalShell>;
}
