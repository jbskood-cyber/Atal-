'use client';

import { useState } from 'react';
import { Check, ChevronRight, Download, FileSpreadsheet, FileText, UsersRound } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';

export function ExportsScreen() {
  const [ready, setReady] = useState('');
  const prepare = (name: string) => { setReady(name); window.setTimeout(() => setReady(''), 1800); };
  return <AtalShell><main className="atal-content atal-flow-page atal-exports-page"><div className="atal-form-heading"><span className="atal-eyebrow">Centro de datos</span><h1>Exportaciones</h1><p>Prepara documentos clínicos con los datos de esta sesión demostrativa.</p></div><section className="atal-export-list"><ExportRow icon={<UsersRound />} title="Directorio de pacientes" detail="Listado general en formato CSV" onClick={() => prepare('Pacientes.csv')} /><ExportRow icon={<FileSpreadsheet />} title="Progreso clínico" detail="Métricas y adherencia en Excel" onClick={() => prepare('Progreso.xlsx')} /><ExportRow icon={<FileText />} title="Resumen de planes" detail="Documento PDF listo para compartir" onClick={() => prepare('Planes.pdf')} /></section>{ready && <div className="atal-export-ready"><Check /><span><b>{ready} preparado</b><small>La descarga real se conectará con el backend.</small></span></div>}</main></AtalShell>;
}
function ExportRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span><Download /><ChevronRight /></button>; }
