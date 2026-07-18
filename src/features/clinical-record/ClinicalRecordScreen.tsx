import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Edit3, FileDown, Printer, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalLogo } from '@/src/components/atal/AtalLogo';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { useExerciseCatalog } from '@/src/data/localExercises';
import { useLocalPlans } from '@/src/data/localPlans';
import { usePatientCatalog } from '@/src/data/localPatients';
import { createClinicalRecord, updateClinicalRecord, useClinicalRecord } from './clinicalRecordRepository';
import type { ClinicalRecord } from './types';
import { useAtalStore } from '@/src/data/atalStore';

function list(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }

export function ClinicalRecordScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const patients=usePatientCatalog();const patient=useMemo(() => patients.find((item)=>item.id===patientId)??null, [patients,patientId]);
  const stored = useClinicalRecord(patientId);
  const [record, setRecord] = useState<ClinicalRecord | null>(stored);
  const [editing, setEditing] = useState(false);
  const [printPreview, setPrintPreview] = useState(false);
  const plans=useLocalPlans();const exerciseCatalog=useExerciseCatalog(true);const professional=useAtalStore((state)=>state.settings.professionalName);
  const patientPlans=plans.filter((item)=>item.patientId===patientId);const plan=patientPlans.find((item)=>item.id===record?.planId)??patientPlans.find((item)=>item.status==='active')??patientPlans.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]??null;
  const planExercises = plan?.exerciseIds.map((id)=>exerciseCatalog.find((item)=>item.id===id)).filter(Boolean) ?? [];
  useEffect(()=>{if(stored)setRecord(stored)},[stored?.id,stored?.updatedAt]);
  if (!patient) return <AtalShell><main className="atal-content atal-clinical-record"><section className="atal-record-empty"><h1>Expediente no disponible</h1><p>No encontramos al paciente solicitado.</p><button type="button" onClick={() => router.push('/patients')}>Volver a pacientes</button></section></main></AtalShell>;

  const fallback: ClinicalRecord = record ?? { id: 'pending-record', patientId, version: 1, date: new Date().toISOString(), reasonForVisit: patient.diagnosis, evolution: '', affectedArea: patient.affectedArea, symptoms: [], painLevel: null, providedDiagnosis: patient.diagnosis, functionalLimitations: [], goals: [], relevantHistory: [], precautions: [], clinicalNotes: '', planId: plan?.id??'', professional, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const current = record ?? fallback;
  const patch = (next: Partial<ClinicalRecord>) => setRecord({ ...current, ...next });
  const save = () => {
    if (record && record.id !== 'pending-record') setRecord(updateClinicalRecord(record.id, record) ?? record);
    else {
      const { id: _id, version: _version, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = current;
      setRecord(createClinicalRecord(input));
    }
    setEditing(false);
  };
  const print = () => window.print();

  return <AtalShell><main className={`atal-content atal-clinical-record${printPreview ? ' is-print-preview' : ''}`}>
    <div className="atal-record-toolbar no-print"><button type="button" onClick={() => router.back()}><ArrowLeft /> Volver</button><div><button type="button" onClick={() => setPrintPreview((value) => !value)}><FileDown /> Vista previa</button><button type="button" onClick={print}><Printer /> Imprimir / PDF</button><button type="button" className="is-primary" onClick={() => editing ? save() : setEditing(true)}>{editing ? <Save /> : <Edit3 />} {editing ? 'Guardar cambios' : 'Editar expediente'}</button></div></div>
    <article className="atal-record-paper">
      <header><AtalLogo /><div><small>Expediente clínico</small><h1>{patient.name}</h1><p>{new Date(current.date).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})} · Versión {current.version}</p></div></header>
      <section className="atal-record-intro"><div><small>Paciente</small><b>{patient.name}</b></div><div><small>Motivo principal</small><b>{current.reasonForVisit || 'Por completar'}</b></div><div><small>Profesional responsable</small><b>{current.professional || 'Por asignar'}</b></div></section>
      <RecordSection title="Valoración inicial" editing={editing} fields={[
        ['Motivo de consulta','reasonForVisit',current.reasonForVisit],['Historia y evolución','evolution',current.evolution],['Zona afectada','affectedArea',current.affectedArea],['Dolor','painLevel',current.painLevel?.toString() ?? ''],['Diagnóstico proporcionado','providedDiagnosis',current.providedDiagnosis],
      ]} onChange={(key,value) => patch({ [key]: key === 'painLevel' ? (value ? Number(value) : null) : value })} />
      <RecordLists editing={editing} record={current} onChange={(key, value) => patch({ [key]: list(value) })} />
      <section className="atal-record-section"><div><span>04</span><h2>Observaciones clínicas</h2></div>{editing ? <textarea value={current.clinicalNotes} onChange={(event) => patch({ clinicalNotes: event.target.value })} /> : <p>{current.clinicalNotes || 'Sin observaciones registradas.'}</p>}</section>
      <section className="atal-record-section"><div><span>05</span><h2>Plan asociado</h2></div>{plan ? <><h3>{plan.title}</h3><p>{plan.goal || plan.focus}</p><div className="atal-record-plan-facts"><span><small>Duración</small><b>{plan.duration}</b></span><span><small>Frecuencia</small><b>{plan.frequency}</b></span><span><small>Estado</small><b>{{active:'Activo',draft:'Borrador',paused:'Pausado',completed:'Completado',archived:'Archivado'}[plan.status]}</b></span></div><ol className="atal-record-exercises">{planExercises.map((exercise) => <li key={exercise?.id}><b>{exercise?.name}</b><span>{exercise?.region} · {exercise?.category}</span></li>)}</ol></> : <p>No hay un plan local asociado a este expediente.</p>}</section>
      <footer><span>Documento generado bajo demanda</span><span>Paciente: {patient.id}</span></footer>
    </article>
    {printPreview && <button type="button" className="atal-record-print-action no-print" onClick={print}><Printer /> Abrir diálogo para Guardar como PDF</button>}
  </main></AtalShell>;
}

function RecordSection({ title, editing, fields, onChange }: { title: string; editing: boolean; fields: [string,string,string][]; onChange: (key: string, value: string) => void }) {
  return <section className="atal-record-section"><div><span>01</span><h2>{title}</h2></div><dl>{fields.map(([label,key,value]) => <div key={key}><dt>{label}</dt><dd>{editing ? <textarea value={value} onChange={(event) => onChange(key,event.target.value)} /> : value || 'Por completar'}</dd></div>)}</dl></section>;
}

function RecordLists({ editing, record, onChange }: { editing: boolean; record: ClinicalRecord; onChange: (key: keyof ClinicalRecord, value: string) => void }) {
  const fields: [string,keyof ClinicalRecord,string[]][] = [['Limitaciones funcionales','functionalLimitations',record.functionalLimitations],['Objetivos','goals',record.goals],['Antecedentes relevantes','relevantHistory',record.relevantHistory],['Precauciones','precautions',record.precautions]];
  return <section className="atal-record-section"><div><span>02</span><h2>Contexto clínico</h2></div><div className="atal-record-list-grid">{fields.map(([label,key,items]) => <article key={String(key)}><h3>{label}</h3>{editing ? <textarea value={items.join('\n')} onChange={(event) => onChange(key,event.target.value)} /> : items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Sin datos registrados.</p>}</article>)}</div></section>;
}
