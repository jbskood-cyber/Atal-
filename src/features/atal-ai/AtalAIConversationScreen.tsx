import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, LoaderCircle, Paperclip, RotateCcw, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalMark } from '@/src/components/atal/AtalLogo';
import { getAtalState, useAtalStore } from '@/src/data/atalStore';
import { requestAtalAI } from './api/geminiClient';
import { clearAIWorkspace, createAIConversation, getAIDraft, getLatestAIConversation, readAIConversations, saveAIConversation, saveAIDraft } from './data/aiRepository';
import { applyAtalAIDraft } from './data/applyDraft';
import { executeConfirmedAICommand, executeImmediateAICommand, getAICommandClass, undoAICommand } from './data/commandRegistry';
import { AIComposer } from './components/AIComposer';
import { AIContextBar, formatWorkContextLabel } from './components/AIContextBar';
import { AtalAIHeader } from './components/AtalAIHeader';
import { AttachmentMenu } from './components/AttachmentMenu';
import { AttachmentPreview } from './components/AttachmentPreview';
import { AudioRecorder } from './components/AudioRecorder';
import { ConversationalDraftCard } from './components/ConversationalDraftCard';
import { SuggestionBar } from './components/SuggestionBar';
import type { AIAttachmentPayload, AIConversation, AIMessage, AtalAIDraft, AtalAIAnalyzeRequest } from './types';

const MAX_FILES=8;
const MAX_FILE_SIZE=8*1024*1024;
const allowedTypes=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
const uid=(prefix:string)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const fileData=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No pudimos leer el archivo.'));reader.readAsDataURL(file)});
const attachmentKind=(file:File):AIAttachmentPayload['kind']=>file.type==='application/pdf'?'pdf':file.type.startsWith('audio/')?'audio':'image';

export function AtalAIConversationScreen() {
  const router=useRouter();
  const initial=useRef(getLatestAIConversation()??createAIConversation());
  const [conversation,setConversation]=useState<AIConversation>(initial.current);
  const [draft,setDraft]=useState<AtalAIDraft|null>(()=>getAIDraft(initial.current.draftId));
  const [attachments,setAttachments]=useState<AIAttachmentPayload[]>([]);
  const [attachmentOpen,setAttachmentOpen]=useState(false);
  const [audioOpen,setAudioOpen]=useState(false);
  const [contextOpen,setContextOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [confirm,setConfirm]=useState<'discard'|'restart'|'command'|null>(null);
  const [notice,setNotice]=useState(initial.current.messages.length?'Conversación recuperada.':'');
  const [retryPayload,setRetryPayload]=useState<{request:AtalAIAnalyzeRequest;messageId?:string}|null>(null);
  const [transcribing,setTranscribing]=useState(false);
  const [applying,setApplying]=useState(false);
  const [forceApply,setForceApply]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [collisionDismissed,setCollisionDismissed]=useState(false);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const abortRef=useRef<AbortController|null>(null);
  const store=useAtalStore((state)=>state);
  const contextLabel=formatWorkContextLabel(conversation.workContext,store.patients,store.plans,store.exercises);

  useEffect(()=>{saveAIConversation({...conversation,updatedAt:new Date().toISOString(),attachmentMetadata:attachments.map(({data:_data,...meta})=>({...meta,available:false}))})},[conversation,attachments]);
  useEffect(()=>{if(draft)saveAIDraft(draft)},[draft]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth',block:'end'})},[conversation.messages.length,conversation.status,draft?.updatedAt]);
  useEffect(()=>{const viewport=window.visualViewport;if(!viewport)return;const sync=()=>{document.documentElement.style.setProperty('--atal-visual-height',`${viewport.height}px`);document.documentElement.classList.toggle('atal-keyboard-open',window.innerHeight-viewport.height>120)};sync();viewport.addEventListener('resize',sync);return()=>{viewport.removeEventListener('resize',sync);document.documentElement.style.removeProperty('--atal-visual-height');document.documentElement.classList.remove('atal-keyboard-open')}},[]);

  const patchConversation=useCallback((patch:Partial<AIConversation>)=>setConversation((current)=>({...current,...patch,updatedAt:new Date().toISOString()})),[]);
  const append=useCallback((message:AIMessage)=>setConversation((current)=>({...current,messages:[...current.messages,message],updatedAt:new Date().toISOString()})),[]);
  const setText=(composerText:string)=>patchConversation({composerText,status:composerText||attachments.length?'composing':draft?'ready_for_review':'empty'});

  const addFiles=async(files:FileList|File[])=>{
    const incoming=Array.from(files);if(attachments.length+incoming.length>MAX_FILES)return setNotice(`Puedes combinar hasta ${MAX_FILES} archivos.`);
    try{const converted:AIAttachmentPayload[]=[];for(const file of incoming){if(!allowedTypes.has(file.type)&&!file.type.startsWith('audio/'))throw new Error(`${file.name}: formato no compatible.`);if(file.size>MAX_FILE_SIZE)throw new Error(`${file.name}: supera 8 MB.`);converted.push({id:uid('attachment'),name:file.name,type:file.type,size:file.size,kind:attachmentKind(file),available:true,data:await fileData(file)})}setAttachments((current)=>[...current,...converted]);setNotice('');patchConversation({status:'composing'})}catch(error){setNotice(error instanceof Error?error.message:'No pudimos adjuntar el archivo.')}
  };
  const addAudio=async(file:File)=>{try{const item:AIAttachmentPayload={id:uid('audio'),name:file.name,type:file.type,size:file.size,kind:'audio',available:true,data:await fileData(file)};setAttachments((current)=>[...current.filter((entry)=>entry.kind!=='audio'),item]);setNotice('Audio listo. Transcríbelo para revisarlo.');setAudioOpen(false)}catch{setNotice('No pudimos preparar el audio.')}};

  const currentVersions=useCallback(()=>{const state=getAtalState();const patient=state.patients.find((item)=>item.id===conversation.workContext.selectedPatientId);const plan=state.plans.find((item)=>item.id===conversation.workContext.selectedPlanId);const record=state.clinicalRecords.find((item)=>item.patientId===conversation.workContext.selectedPatientId);return{patientUpdatedAt:patient?.updatedAt??'',planUpdatedAt:plan?.updatedAt??'',recordUpdatedAt:record?.updatedAt??''}},[conversation.workContext]);

  const process=async(request:AtalAIAnalyzeRequest,userMessage?:AIMessage)=>{
    abortRef.current?.abort();const controller=new AbortController();abortRef.current=controller;
    setRetryPayload({request,messageId:userMessage?.id});
    setConversation((current)=>({...current,messages:userMessage?[...current.messages,userMessage]:current.messages,composerText:'',transcription:'',status:'processing',error:undefined,updatedAt:new Date().toISOString()}));
    setNotice('');
    try{
      const result=await requestAtalAI(request,controller.signal);if(!result.draft)throw new Error('Gemini no devolvió una respuesta estructurada.');
      const next={...result.draft,baseVersions:result.draft.baseVersions.planUpdatedAt||result.draft.baseVersions.patientUpdatedAt?result.draft.baseVersions:currentVersions()};
      if(next.responseMode==='query'&&next.command){const commandResult=executeImmediateAICommand(next.command,conversation.workContext);append({id:uid('message'),role:'assistant',text:commandResult.message,createdAt:new Date().toISOString(),attachments:[]});patchConversation({status:draft?'ready_for_review':'empty'});}
      else{setDraft(next);saveAIDraft(next);const status=next.missingFields.length||next.uncertainFields.length?'needs_information':'ready_for_review';setConversation((current)=>({...current,status,composerText:'',transcription:'',attachmentMetadata:[],messages:[...current.messages,{id:uid('message'),role:'assistant',text:next.assistantMessage||next.followUpQuestion||'Preparé el borrador. Puedes revisarlo aquí antes de aplicar cambios.',createdAt:new Date().toISOString(),attachments:[]}],updatedAt:new Date().toISOString()}));}
      setAttachments([]);setAudioOpen(false);
    }catch(error){if(error instanceof DOMException&&error.name==='AbortError'){patchConversation({status:draft?'ready_for_review':'empty'});setNotice('Procesamiento cancelado. Tu mensaje se conservó.');return}patchConversation({status:'error',error:error instanceof Error?error.message:'No pudimos procesar la solicitud.'})}
    finally{abortRef.current=null}
  };

  const send=()=>{
    const text=conversation.composerText.trim();const transcription=conversation.transcription.trim();if(!text&&!transcription&&!attachments.length)return;
    if(conversation.workContext.patientMode==='existing'&&!conversation.workContext.selectedPatientId)return setNotice('Selecciona el paciente antes de continuar.');
    if(['update_existing_plan','update_plan_status','archive_plan','restore_plan','replace_active_plan'].includes(conversation.workContext.intent)&&!conversation.workContext.selectedPlanId)return setNotice('Selecciona el plan antes de continuar.');
    if(conversation.workContext.intent==='update_existing_exercise'&&!conversation.workContext.selectedExerciseId)return setNotice('Selecciona el ejercicio antes de continuar.');
    const message:AIMessage={id:uid('message'),role:'user',text:[text,transcription&&`Transcripción: ${transcription}`].filter(Boolean).join('\n\n'),createdAt:new Date().toISOString(),attachments:attachments.map(({data:_data,...meta})=>meta)};
    const patient=store.patients.find((item)=>item.id===conversation.workContext.selectedPatientId);const record=store.clinicalRecords.find((item)=>item.patientId===patient?.id);const plan=store.plans.find((item)=>item.id===conversation.workContext.selectedPlanId);const exercise=store.exercises.find((item)=>item.id===conversation.workContext.selectedExerciseId);
    const existingContext=patient||exercise?{patient:patient?{id:patient.id,name:patient.name,diagnosis:patient.diagnosis,age:patient.age,affectedArea:patient.affectedArea}:undefined,clinicalRecord:record?{reasonForVisit:record.reasonForVisit,evolution:record.evolution,affectedArea:record.affectedArea,symptoms:record.symptoms,painLevel:record.painLevel,providedDiagnosis:record.providedDiagnosis,functionalLimitations:record.functionalLimitations,goals:record.goals,relevantHistory:record.relevantHistory,precautions:record.precautions,clinicalNotes:record.clinicalNotes}:undefined,plan:plan?{id:plan.id,title:plan.title,focus:plan.focus,duration:plan.duration,frequency:plan.frequency,goal:plan.goal,exerciseIds:plan.exerciseIds,status:plan.status,progression:plan.progression,reportCriteria:plan.reportCriteria,generalInstructions:plan.generalInstructions}:undefined,exercise:exercise?{id:exercise.id,name:exercise.name,region:exercise.region,category:exercise.category,objective:exercise.objective,sets:exercise.sets,repetitions:exercise.repetitions,time:exercise.time,status:exercise.status}:undefined}:undefined;
    void process({mode:'analyze',draftId:conversation.draftId,text,transcription,attachments,currentDraft:draft,workContext:conversation.workContext,existingContext},message);
  };

  const transcribe=async()=>{const audio=attachments.find((item)=>item.kind==='audio');if(!audio)return;setTranscribing(true);try{const result=await requestAtalAI({mode:'transcribe',draftId:conversation.draftId,text:'',attachments:[audio]});patchConversation({transcription:result.transcript??''});setNotice('Transcripción lista para revisar.')}catch(error){setNotice(error instanceof Error?error.message:'No pudimos transcribir el audio.')}finally{setTranscribing(false)}};
  const restart=()=>{const fresh=createAIConversation();setConversation(fresh);setDraft(null);setAttachments([]);setConfirm(null);setNotice('Nueva conversación preparada.')};
  const discard=()=>{clearAIWorkspace(conversation.id,conversation.draftId);restart();setNotice('Borrador descartado.')};
  const retry=()=>{if(retryPayload)void process(retryPayload.request)};
  const editFailed=()=>{if(!retryPayload)return;setConversation((current)=>({...current,composerText:[retryPayload.request.text,retryPayload.request.transcription].filter(Boolean).join('\n\n'),status:'composing',error:undefined,messages:retryPayload.messageId?current.messages.filter((item)=>item.id!==retryPayload.messageId):current.messages}));composerRef.current?.focus()};

  const conflict=useMemo(()=>{if(!draft||forceApply)return'';const current=currentVersions();if(draft.baseVersions.planUpdatedAt&&current.planUpdatedAt!==draft.baseVersions.planUpdatedAt)return'El plan seleccionado tiene una versión más reciente.';if(draft.baseVersions.recordUpdatedAt&&current.recordUpdatedAt!==draft.baseVersions.recordUpdatedAt)return'El expediente seleccionado tiene una versión más reciente.';if(draft.baseVersions.patientUpdatedAt&&current.patientUpdatedAt!==draft.baseVersions.patientUpdatedAt)return'El paciente seleccionado tiene cambios más recientes.';return''},[draft,forceApply,currentVersions,store.updatedAt]);
  const refreshConflict=()=>{if(!draft)return;const state=getAtalState();const patient=state.patients.find((item)=>item.id===draft.selectedPatientId);const record=state.clinicalRecords.find((item)=>item.patientId===draft.selectedPatientId);const plan=state.plans.find((item)=>item.id===draft.selectedPlanId);setDraft({...draft,patient:{...draft.patient,name:patient?.name??draft.patient.name,age:patient?.age??draft.patient.age,reasonForVisit:record?.reasonForVisit??draft.patient.reasonForVisit,evolutionTime:record?.evolution??draft.patient.evolutionTime,providedDiagnosis:record?.providedDiagnosis??draft.patient.providedDiagnosis,clinicalNotes:record?.clinicalNotes??draft.patient.clinicalNotes},plan:{...draft.plan,title:plan?.title??draft.plan.title,goal:plan?.goal??draft.plan.goal,focus:plan?.focus??draft.plan.focus,duration:plan?{value:null,unit:'custom',customText:plan.duration}:draft.plan.duration,frequency:plan?{value:null,period:'custom',customText:plan.frequency}:draft.plan.frequency,progressCriteria:plan?.reportCriteria??draft.plan.progressCriteria},baseVersions:currentVersions(),updatedAt:new Date().toISOString()});setNotice('Borrador actualizado con la versión vigente.')};

  const apply=()=>{
    if(!draft)return;if(draft.responseMode==='command'&&draft.command&&getAICommandClass(draft.command)==='delicate'){setConfirm('command');return}void performApply();
  };
  const performApply=async()=>{if(!draft)return;setApplying(true);try{let result;if(draft.responseMode==='command'&&draft.command){const commandResult=executeConfirmedAICommand(draft.command,conversation.workContext,{conversationId:conversation.id,draftId:draft.id});result={summary:[commandResult.message],undo:commandResult.undo,planId:draft.command.planId||conversation.workContext.selectedPlanId,patientId:draft.command.patientId||conversation.workContext.selectedPatientId};}else result=applyAtalAIDraft(draft,conversation.privateContact,{conversationId:conversation.id,draftId:draft.id,force:forceApply});const next={...conversation,status:'saved' as const,savedResult:result,updatedAt:new Date().toISOString()};setConversation(next);saveAIConversation(next);append({id:uid('message'),role:'assistant',text:`Cambios aplicados. ${result.summary.join(' ')}`,createdAt:new Date().toISOString(),attachments:[]});setConfirm(null);setForceApply(false)}catch(error){setNotice(error instanceof Error?error.message:'No pudimos aplicar los cambios.')}finally{setApplying(false)}};
  const undo=()=>{const token=conversation.savedResult?.undo;if(!token)return;try{undoAICommand(token);patchConversation({savedResult:{...conversation.savedResult!,undo:undefined}});append({id:uid('message'),role:'assistant',text:'Cambio deshecho correctamente.',createdAt:new Date().toISOString(),attachments:[]})}catch(error){setNotice(error instanceof Error?error.message:'No fue posible deshacer.')}};

  const matchingPatient=!collisionDismissed&&draft?.patient.name.trim()&&conversation.workContext.patientMode==='new'?store.patients.find((patient)=>patient.name.localeCompare(draft.patient.name,'es',{sensitivity:'base'})===0):undefined;
  const patientLabel=conversation.workContext.patientMode==='existing'?store.patients.find((item)=>item.id===conversation.workContext.selectedPatientId)?.name??'Paciente existente':draft?.patient.name||'Paciente nuevo';
  const hasReadyContent=Boolean(conversation.composerText.trim()||conversation.transcription.trim()||attachments.length);

  return <main className="atal-command-page">
    <AtalAIHeader contextLabel={contextLabel} hasDraft={Boolean(draft||conversation.messages.length)} onBack={()=>router.push('/')} onContext={()=>setContextOpen(true)} onSave={()=>{saveAIConversation(conversation);if(draft)saveAIDraft(draft);setNotice('Borrador guardado en este dispositivo.')}} onConversations={()=>setHistoryOpen(true)} onRestart={()=>setConfirm('restart')} onDiscard={()=>setConfirm('discard')}/>
    <section className="atal-command-thread" aria-live="polite">
      {!conversation.messages.length&&<article className="atal-command-intro"><AtalMark/><div><b>Atal IA</b><p>¿Qué necesitas preparar o consultar?</p></div></article>}
      {conversation.messages.map((message)=><article key={message.id} className={`atal-command-message is-${message.role}`}><span>{message.role==='assistant'?<AtalMark/>:<UserRound/>}</span><div><header><b>{message.role==='assistant'?'Atal IA':'Tú'}</b><time>{new Date(message.createdAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</time></header><p>{message.text}</p>{message.attachments.length>0&&<div className="atal-command-message-files">{message.attachments.map((item)=><small key={item.id}><Paperclip/>{item.name}</small>)}</div>}</div></article>)}
      {conversation.status==='processing'&&<div className="atal-command-processing" role="status" aria-live="assertive"><LoaderCircle className="is-spinning"/><span><b>Comprobando información…</b><small>Atal IA está actualizando el mismo borrador</small></span></div>}
      {conversation.error&&<div className="atal-command-error" role="alert"><AlertTriangle/><div><b>No pudimos completar la solicitud</b><p>{conversation.error}</p><span><button type="button" onClick={retry}><RotateCcw/>Reintentar</button><button type="button" onClick={editFailed}>Editar y reenviar</button></span></div></div>}
      {matchingPatient&&<div className="atal-command-match"><UserRound/><div><b>Encontré a {matchingPatient.name}</b><p>{matchingPatient.diagnosis}</p><span><button type="button" onClick={()=>{const workContext={intent:'create_plan_for_existing_patient' as const,patientMode:'existing' as const,selectedPatientId:matchingPatient.id,selectedPlanId:'',selectedExerciseId:''};patchConversation({workContext});setDraft((current)=>current?{...current,intent:workContext.intent,selectedPatientId:matchingPatient.id,updatedAt:new Date().toISOString()}:current);setCollisionDismissed(true)}}>Usar paciente existente</button><button type="button" onClick={()=>setCollisionDismissed(true)}>Crear paciente nuevo</button></span></div></div>}
      {draft&&<><SuggestionBar text={conversation.composerText} draft={draft} attachments={attachments.length} onChip={(guide)=>{setText(`${conversation.composerText}${conversation.composerText?'\n':''}${guide}`);composerRef.current?.focus()}}/><ConversationalDraftCard draft={draft} patientLabel={patientLabel} applying={applying} applied={conversation.status==='saved'} conflict={conflict} onChange={(next)=>{setDraft(next);patchConversation({status:'ready_for_review',savedResult:undefined})}} onApply={apply} onReviewAll={()=>router.push(`/assistant/drafts/${draft.id}`)} onRefreshConflict={refreshConflict} onCompare={()=>setCompareOpen(true)} onKeepVersion={()=>setForceApply(true)}/></>}
      {conversation.savedResult&&<section className="atal-command-result"><CheckCircle2/><div><b>Cambios aplicados</b><ul>{conversation.savedResult.summary.map((item)=><li key={item}>{item}</li>)}</ul><span>{conversation.savedResult.patientId&&<button type="button" onClick={()=>router.push(`/patients/${conversation.savedResult?.patientId}`)}>Ver paciente<ChevronRight/></button>}{conversation.savedResult.planId&&<button type="button" onClick={()=>router.push(`/plans/${conversation.savedResult?.planId}`)}>Ver plan<ChevronRight/></button>}{conversation.savedResult.patientId&&conversation.savedResult.planId&&<button type="button" onClick={()=>router.push(`/patients/${conversation.savedResult?.patientId}/portal-preview`)}>Vista del paciente<ChevronRight/></button>}</span>{conversation.savedResult.undo&&<button type="button" className="atal-command-undo" onClick={undo}>Deshacer cambio</button>}</div></section>}
      <div ref={endRef}/>
    </section>
    <section className="atal-command-compose-zone">
      {notice&&<p className="atal-command-toast"><Sparkles/>{notice}<button type="button" aria-label="Cerrar aviso" onClick={()=>setNotice('')}><X/></button></p>}
      <AttachmentPreview items={attachments} onRemove={(id)=>setAttachments((current)=>current.filter((item)=>item.id!==id))} onReplace={()=>setAttachmentOpen(true)}/>
      {audioOpen&&<AudioRecorder onReady={addAudio} onState={(status,message)=>{patchConversation({status:status==='recording'||status==='paused'?'recording':'composing'});if(message)setNotice(message)}}/>}
      {attachments.some((item)=>item.kind==='audio')&&<button type="button" className="atal-command-transcribe" disabled={transcribing} onClick={()=>void transcribe()}>{transcribing?<LoaderCircle className="is-spinning"/>:<FileText/>}{transcribing?'Transcribiendo…':'Transcribir audio'}</button>}
      {conversation.transcription&&<label className="atal-command-transcript"><span>Transcripción editable</span><textarea value={conversation.transcription} onChange={(event)=>patchConversation({transcription:event.target.value})}/></label>}
      <AIComposer textareaRef={composerRef} value={conversation.composerText} hasReadyContent={hasReadyContent} processing={conversation.status==='processing'} recording={conversation.status==='recording'} onChange={setText} onAttach={()=>setAttachmentOpen(true)} onSend={send} onMicrophone={()=>setAudioOpen((value)=>!value)} onCancelProcessing={()=>abortRef.current?.abort()}/>
      <small>Atal IA propone. Tú revisas y confirmas.</small>
    </section>
    <AttachmentMenu open={attachmentOpen} onClose={()=>{setAttachmentOpen(false);composerRef.current?.focus()}} onFiles={(files)=>void addFiles(files)}/>
    <AIContextBar open={contextOpen} context={conversation.workContext} patients={store.patients} plans={store.plans} exercises={store.exercises} onChange={(workContext)=>{patchConversation({workContext});setDraft((current)=>current?{...current,intent:workContext.intent,selectedPatientId:workContext.selectedPatientId,selectedPlanId:workContext.selectedPlanId,selectedExerciseId:workContext.selectedExerciseId,baseVersions:currentVersions(),updatedAt:new Date().toISOString()}:current)}} onClose={()=>setContextOpen(false)}/>
    {historyOpen&&<HistoryDialog currentId={conversation.id} onClose={()=>setHistoryOpen(false)} onSelect={(next)=>{setConversation(next);setDraft(getAIDraft(next.draftId));setHistoryOpen(false)}}/>}
    {confirm&&<ConfirmDialog kind={confirm} draft={draft} onCancel={()=>setConfirm(null)} onConfirm={()=>confirm==='discard'?discard():confirm==='restart'?restart():void performApply()}/>}
    {compareOpen&&draft&&<CompareDialog draft={draft} onClose={()=>setCompareOpen(false)}/>}
  </main>;
}

function HistoryDialog({currentId,onClose,onSelect}:{currentId:string;onClose:()=>void;onSelect:(conversation:AIConversation)=>void}){
  const items=readAIConversations().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeRef.current?.focus();const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onClose]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-label="Conversaciones" onMouseDown={onClose}><section className="atal-history-sheet" onMouseDown={(event)=>event.stopPropagation()}><header><div><small>Atal IA</small><h2>Conversaciones</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"><X/></button></header><div>{items.map((item)=><button type="button" key={item.id} className={item.id===currentId?'is-selected':''} onClick={()=>onSelect(item)}><span><b>{item.workContext.intent.replaceAll('_',' ')}</b><small>{new Date(item.updatedAt).toLocaleString('es-MX')}</small></span><ChevronRight/></button>)}{!items.length&&<p>No hay conversaciones guardadas.</p>}</div></section></div>
}

function ConfirmDialog({kind,draft,onCancel,onConfirm}:{kind:'discard'|'restart'|'command';draft:AtalAIDraft|null;onCancel:()=>void;onConfirm:()=>void}){
  const copy=kind==='discard'?['¿Descartar este borrador?','Se eliminará esta conversación y sus ediciones. Los datos ya aplicados no cambiarán.','Descartar borrador']:kind==='restart'?['¿Empezar una conversación nueva?','El trabajo actual seguirá guardado en conversaciones para que puedas retomarlo.','Empezar de nuevo']:['¿Aplicar esta acción?',draft?.assistantMessage||'La acción modificará datos reales de Atal y quedará registrada en el historial.','Confirmar y aplicar'];const cancelRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{cancelRef.current?.focus();const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onCancel()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onCancel]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-labelledby="atal-confirm-title" onMouseDown={onCancel}><section className="atal-confirm-sheet" onMouseDown={(event)=>event.stopPropagation()}><AlertTriangle/><h2 id="atal-confirm-title">{copy[0]}</h2><p>{copy[1]}</p><button type="button" className="is-primary" onClick={onConfirm}>{copy[2]}</button><button ref={cancelRef} type="button" onClick={onCancel}>Cancelar</button></section></div>
}

function CompareDialog({draft,onClose}:{draft:AtalAIDraft;onClose:()=>void}){
  const state=getAtalState();const plan=state.plans.find((item)=>item.id===draft.selectedPlanId);const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeRef.current?.focus();const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onClose]);
  return <div className="atal-command-dialog" role="dialog" aria-modal="true" aria-label="Comparar cambios" onMouseDown={onClose}><section className="atal-compare-sheet" onMouseDown={(event)=>event.stopPropagation()}><header><h2>Comparar cambios</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"><X/></button></header><div><article><small>Versión actual</small><b>{plan?.title||'Sin plan vigente'}</b><p>{plan?.goal||'—'}</p><p>{plan?.duration} · {plan?.frequency}</p></article><article><small>Tu borrador</small><b>{draft.plan.title||'Sin título'}</b><p>{draft.plan.goal||'—'}</p><p>{draft.plan.duration.customText||draft.plan.duration.value} · {draft.plan.frequency.customText||draft.plan.frequency.value}</p></article></div></section></div>
}
