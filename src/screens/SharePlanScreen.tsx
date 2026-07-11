'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, ExternalLink, Link2, MessageCircle, QrCode, ShieldCheck } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';

export function SharePlanScreen() {
  const router = useRouter(); const [copied, setCopied] = useState(false); const url = 'atal.app/p/demo-plan-01';
  const copy = async () => { try { await navigator.clipboard.writeText(`https://${url}`); } catch {} setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <AtalShell><main className="atal-content atal-flow-page atal-share-page"><div className="atal-flow-topbar"><button type="button" onClick={() => router.back()}><ArrowLeft /></button><span>Compartir plan</span><i /></div><div className="atal-form-heading"><h1>Enlace seguro</h1><p>Comparte el portal del paciente sin solicitarle una cuenta.</p></div><section className="atal-share-card"><span><ShieldCheck /></span><h2>Rehabilitación — Fase 1</h2><p>Paciente Demo 01</p><label><Link2 /><input readOnly value={url} /><button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}</button></label><small>El enlace permite consultar el plan y enviar reportes de forma privada.</small></section><div className="atal-share-actions"><button type="button" onClick={copy}><MessageCircle /> Compartir por WhatsApp</button><button type="button"><QrCode /> Mostrar código QR</button><button type="button" onClick={() => router.push('/portal')}><ExternalLink /> Abrir portal</button></div></main></AtalShell>;
}
