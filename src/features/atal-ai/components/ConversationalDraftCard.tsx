import { AlertTriangle, ChevronDown, ClipboardList, Dumbbell, FileDown, FileText, FolderOpen, Pencil, Save, StickyNote, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AtalAIDraft } from '../types';
import { DraftSectionEditor, type DraftSectionId } from './DraftSectionEditor';

type Section = { id: DraftSectionId; title: string; subtitle: string; percent: number; missing?: string; icon: typeof UserRound };
const filled = (value: unknown) => Array.isArray(value) ? value.length > 0 : typeof value === 'number' ? true : Boolean(String(value ?? '').trim());
const percentage = (values: unknown[]) => Math.round(values.filter(filled).length / Math.max(1,values.length) * 100);

function duration(draft: AtalAIDraft) { const value=draft.plan.duration;return value.customText || (value.value === null ? 'Duración por definir' : `${value.value} ${value.unit === 'days' ? 'días' : value.unit === 'months' ? 'meses' : 'semanas'}`); }
function frequency(draft: AtalAIDraft) { const value=draft.plan.frequency;return value.customText || (value.value === null ? 'Frecuencia por definir' : `${value.value} ${value.value===1?'vez':'veces'} por ${value.period==='day'?'día':value.period==='month'?'mes':'semana'}`); }

function sectionsFor(draft: AtalAIDraft, patientLabel: string): Section[] {
  if (draft.responseMode === 'command' && draft.command) {
    if (draft.command.type === 'add_patient_note') return [{id:'note',title:'Nota clínica',subtitle:draft.command.content || 'Contenido por completar',percent:percentage([draft.command.patientId || draft.selectedPatientId,draft.command.content]),missing:!draft.command.content?'Falta contenido':undefined,icon:StickyNote}];
    if (['summarize_sessions','create_report'].includes(draft.command.type)) return [{id:draft.command.type==='create_report'?'report':'session',title:draft.command.type==='create_report'?'Reporte':'Sesiones',subtitle:patientLabel,percent:percentage([draft.command.patientId || draft.selectedPatientId]),missing:!(draft.command.patientId||draft.selectedPatientId)?'Falta paciente':undefined,icon:FileText}];
    if (draft.command.type === 'export_data') return [{id:'export',title:'Exportación',subtitle:draft.command.exportType || 'Respaldo local',percent:100,icon:FileDown}];
    return [{id:'plan',title:'Plan',subtitle:draft.assistantMessage || 'Cambio de estado preparado',percent:percentage([draft.command.planId || draft.selectedPlanId]),missing:!(draft.command.planId||draft.selectedPlanId)?'Falta plan':undefined,icon:ClipboardList}];
  }
  const items: Section[]=[];
  if (!['create_exercise','update_existing_exercise'].includes(draft.intent)) items.push({id:'patient',title:'Paciente',subtitle:patientLabel,percent:percentage([draft.patient.name||draft.selectedPatientId,draft.patient.reasonForVisit,draft.patient.age??draft.patient.birthDate,draft.patient.goals]),missing:!draft.patient.reasonForVisit?'Falta motivo':undefined,icon:UserRound});
  if (['create_patient_plan','update_patient_record'].includes(draft.intent)) items.push({id:'record',title:'Expediente',subtitle:draft.patient.providedDiagnosis||draft.patient.reasonForVisit||'Resumen clínico por completar',percent:percentage([draft.patient.evolutionTime,draft.patient.relevantHistory,draft.patient.clinicalNotes,draft.patient.functionalLimitations,draft.patient.precautions]),missing:!draft.patient.evolutionTime?'Falta evolución':undefined,icon:FolderOpen});
  if (['create_patient_plan','create_plan_for_existing_patient','update_existing_plan'].includes(draft.intent)) items.push({id:'plan',title:'Plan',subtitle:`${duration(draft)} · ${frequency(draft)}`,percent:percentage([draft.plan.title,draft.plan.goal,draft.plan.focus,draft.plan.duration.value??draft.plan.duration.customText,draft.plan.frequency.value??draft.plan.frequency.customText,draft.plan.progressCriteria]),missing:!filled(draft.plan.frequency.value??draft.plan.frequency.customText)?'Falta frecuencia':undefined,icon:ClipboardList});
  if (draft.intent !== 'update_patient_record') items.push({id:'exercises',title:draft.intent==='update_existing_exercise'?'Ejercicio':'Ejercicios',subtitle:draft.exercises.length?`${draft.exercises.length} ${draft.exercises.length===1?'ejercicio':'ejercicios'} · contenido editable`:'Programa por completar',percent:draft.exercises.length?Math.round(draft.exercises.reduce((sum,item)=>sum+percentage([item.name,item.sets,item.repetitions||item.duration,item.instructions,item.precautions]),0)/draft.exercises.length):0,missing:!draft.exercises.length?'Faltan ejercicios':undefined,icon:Dumbbell});
  return items;
}

export function ConversationalDraftCard({ draft,patientLabel,applying,applied,conflict,onChange,onApply,onReviewAll,onRefreshConflict,onCompare,onKeepVersion }: { draft:AtalAIDraft;patientLabel:string;applying:boolean;applied:boolean;conflict?:string;onChange:(draft:AtalAIDraft)=>void;onApply:()=>void;onReviewAll:()=>void;onRefreshConflict:()=>void;onCompare:()=>void;onKeepVersion:()=>void }) {
  const [openSection,setOpenSection]=useState<DraftSectionId|null>(null);
  const [cardOpen,setCardOpen]=useState(true);
  const [editing,setEditing]=useState<DraftSectionId|null>(null);
  const cardRef=useRef<HTMLElement>(null);
  const mountedRef=useRef(false);
  const sections=useMemo(()=>sectionsFor(draft,patientLabel),[draft,patientLabel]);
  const total=sections.length?Math.round(sections.reduce((sum,item)=>sum+item.percent,0)/sections.length):0;
  const warnings=draft.missingFields.length+draft.uncertainFields.length+draft.contradictions.length;
  const hasContradictions=draft.contradictions.length>0;

  useEffect(()=>{
    if(!mountedRef.current){mountedRef.current=true;return;}
    let secondFrame=0;
    const firstFrame=window.requestAnimationFrame(()=>{
      secondFrame=window.requestAnimationFrame(()=>cardRef.current?.scrollIntoView({behavior:'smooth',block:'end'}));
    });
    return()=>{window.cancelAnimationFrame(firstFrame);if(secondFrame)window.cancelAnimationFrame(secondFrame)};
  },[cardOpen,openSection]);

  return <>
    <section ref={cardRef} className={`atal-draft-card ${cardOpen?'is-expanded':'is-collapsed'}`} aria-label="Borrador preparado">
      <button type="button" className="atal-draft-card-header" aria-expanded={cardOpen} onClick={()=>{setCardOpen((value)=>!value);setOpenSection(null)}}><span><b>{draft.responseMode==='command'?'Acción preparada':'Borrador del plan de tratamiento'}</b></span><Status percent={total} review={warnings>0}/><ChevronDown className={cardOpen?'is-open':''}/></button>
      {conflict && <aside className="atal-draft-conflict" role="alert"><AlertTriangle/><div><b>Esta información cambió después de crear el borrador.</b><p>{conflict}</p><span><button type="button" onClick={onRefreshConflict}>Actualizar borrador</button><button type="button" onClick={onCompare}>Comparar</button><button type="button" onClick={onKeepVersion}>Conservar mi versión</button></span></div></aside>}
      {hasContradictions&&<aside className="atal-draft-conflict" role="alert"><AlertTriangle/><div><b>Hay contradicciones clínicas por resolver.</b><p>{draft.contradictions.join(' ')}</p><span><button type="button" onClick={onReviewAll}>Revisar el borrador</button></span></div></aside>}
      {cardOpen && <div className="atal-draft-sections">{sections.map((section) => { const Icon=section.icon;const open=openSection===section.id;return <article key={section.id} className={open?'is-open':''}><button type="button" className="atal-draft-row" aria-expanded={open} aria-controls={`draft-${section.id}`} onClick={()=>setOpenSection(open?null:section.id)}><span className="atal-draft-icon"><Icon/></span><span className="atal-draft-copy"><b>{section.title}</b><small>{section.subtitle}</small></span><Status percent={section.percent} review={Boolean(section.missing)}/><ChevronDown className={open?'is-open':''}/></button>{open&&<div id={`draft-${section.id}`} className="atal-draft-detail"><button type="button" className="atal-draft-edit" aria-label={`Editar sección ${section.title}`} onClick={()=>setEditing(section.id)}><Pencil/></button><SectionPreview section={section.id} draft={draft}/>{section.missing&&<p className="atal-draft-missing"><AlertTriangle/>{section.missing}</p>}</div>}</article>})}</div>}
      {cardOpen && <footer className={draft.responseMode==='command'?'is-single-action':''}>{draft.responseMode!=='command'&&<button type="button" onClick={onReviewAll}>Revisar todo</button>}<button type="button" className="is-primary" disabled={applying||applied||Boolean(conflict)||hasContradictions} onClick={onApply}><Save/>{applied?'Aplicado a Atal':applying?'Aplicando…':hasContradictions?'Resuelve contradicciones':'Aplicar cambios'}</button></footer>}
    </section>
    {editing&&<DraftSectionEditor section={editing} draft={draft} onCancel={()=>setEditing(null)} onSave={(next)=>{onChange(next);setEditing(null);setOpenSection(null)}}/>}
  </>;
}

function Status({percent,review}:{percent:number;review:boolean}) {const tone=percent>=100?'is-complete':percent<=25?'is-low':percent<75?'is-mid':'is-high';return <span className={`atal-draft-status ${tone}${review?' has-review':''}`} aria-label={`${percent}% completo`}>{percent}%</span>;}
function SectionPreview({section,draft}:{section:DraftSectionId;draft:AtalAIDraft}) {if(section==='patient')return <dl><div><dt>Identidad</dt><dd>{draft.patient.name||'Por completar'}{draft.patient.age!==null?` · ${draft.patient.age} años`:''}</dd></div><div><dt>Motivo</dt><dd>{draft.patient.reasonForVisit||'Por completar'}</dd></div><div><dt>Objetivo funcional</dt><dd>{draft.patient.goals.join(', ')||'Por completar'}</dd></div></dl>;if(section==='record')return <dl><div><dt>Evolución</dt><dd>{draft.patient.evolutionTime||'Por completar'}</dd></div><div><dt>Hallazgos</dt><dd>{draft.patient.clinicalNotes||draft.patient.providedDiagnosis||'Por completar'}</dd></div><div><dt>Precauciones</dt><dd>{draft.patient.precautions.join(', ')||'Sin precauciones indicadas'}</dd></div></dl>;if(section==='plan')return <dl><div><dt>Objetivo general</dt><dd>{draft.plan.goal||'Por completar'}</dd></div><div><dt>Enfoque clínico</dt><dd>{draft.plan.focus||'Por completar'}</dd></div><div><dt>Duración y frecuencia</dt><dd>{duration(draft)} · {frequency(draft)}</dd></div><div><dt>Criterios de progreso</dt><dd>{draft.plan.progressCriteria||'Por completar'}</dd></div></dl>;if(section==='exercises')return <ol>{draft.exercises.map((item)=><li key={item.id}><b>{item.name||'Sin nombre'}</b><span>{item.sets??'—'} series · {item.repetitions||item.duration||'dosis por completar'}</span></li>)}</ol>;if(section==='note')return <p>{draft.command?.content||'Nota por completar'}</p>;return <p>{draft.assistantMessage||draft.command?.content||'Acción preparada para revisión.'}</p>;