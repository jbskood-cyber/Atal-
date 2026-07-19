'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check, Clock3, RefreshCw, Save } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { addPatientNote,createPatientWithRecord,useAtalStore } from '@/src/data/atalStore';

export function NewPatientScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [visit, setVisit] = useState<'first' | 'followup'>('first');
  const professional=useAtalStore((state)=>state.settings.professionalName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !diagnosis.trim()) return;
    const {patient}=createPatientWithRecord({name:name.trim(),diagnosis:diagnosis.trim(),age:age?Number(age):null,birthDate:'',sex:'',affectedArea:'',status:'active',visitType:visit,contact:{phone,email:'',address:'',emergencyContact:''}},{date:new Date().toISOString(),reasonForVisit:diagnosis.trim(),evolution:'',affectedArea:'',symptoms:[],painLevel:null,providedDiagnosis:diagnosis.trim(),functionalLimitations:[],goals:[],relevantHistory:[],precautions:[],clinicalNotes:notes.trim(),planId:'',professional});
    if(notes.trim())addPatientNote(patient.id,notes,professional);
    router.push(`/patients/${patient.id}`);
  };

  return <AtalShell>
    <main className="atal-content atal-flow-page">
      <div className="atal-flow-topbar"><button type="button" onClick={() => router.back()} aria-label="Volver"><ArrowLeft /></button><span>Nuevo paciente</span><i /></div>
      <div className="atal-form-heading"><h1>Nuevo paciente</h1><p>Registra los datos esenciales. Podrás completar el expediente después.</p></div>
      <form className="atal-clinical-form" onSubmit={submit}>
        <section className="atal-new-patient-hero"><button type="button" className="atal-photo-button" disabled title="Las fotografías de perfil se habilitarán con identidad y consentimiento."><Camera /><span>Foto no disponible en modo local</span></button><div><small>Estado</small><span className="atal-status-pill"><i /> Activo</span></div></section>
        <fieldset><legend>Datos personales</legend>
          <label className="atal-field atal-field--full"><span>Nombre completo</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Paciente Demo 13" /></label>
          <div className="atal-field-grid"><label className="atal-field"><span>WhatsApp</span><div className="atal-phone-field"><b>+52</b><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="300 123 4567" /></div></label><label className="atal-field"><span>Edad</span><div className="atal-suffix-field"><input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="35" /><b>años</b></div></label></div>
          <label className="atal-field atal-field--full"><span>Motivo / diagnóstico</span><input required value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Escribe el motivo o diagnóstico" /></label>
          <label className="atal-field atal-field--full"><span>Notas clínicas</span><textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones relevantes, historia clínica, detalles importantes…" /><small className="atal-character-count">{notes.length}/500</small></label>
        </fieldset>
        <fieldset><legend>Datos rápidos</legend><div className="atal-choice-row"><button type="button" className={visit === 'first' ? 'is-active' : ''} onClick={() => setVisit('first')}><Clock3 /> Primera vez</button><button type="button" className={visit === 'followup' ? 'is-active' : ''} onClick={() => setVisit('followup')}><RefreshCw /> Seguimiento</button></div></fieldset>
        <button type="submit" className="atal-submit-button" disabled={!name.trim() || !diagnosis.trim()}><Save /> Guardar paciente <Check /></button>
      </form>
    </main>
  </AtalShell>;
}
