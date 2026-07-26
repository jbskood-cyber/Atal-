import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const sessionActions = () => loadCore('src/domain/actions/sessionActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2,
    seededAt: createdAt,
    updatedAt: createdAt,
    patients: [{ id:'patient-1', name:'Paciente', diagnosis:'', age:null, birthDate:'', sex:'', affectedArea:'', status:'active', visitType:'first', contact:{phone:'',email:'',address:'',emergencyContact:''}, createdAt, updatedAt:createdAt }],
    plans: [{ id:'plan-1', patientId:'patient-1', title:'Plan', focus:'', duration:'', frequency:'', goal:'', exerciseIds:['exercise-1'], status:'active', progression:'', reportCriteria:'', generalInstructions:'', createdAt, updatedAt:createdAt }],
    exercises: [{ id:'exercise-1', name:'Ejercicio', region:'', category:'', objective:'', startingPosition:'', instructions:['Mover'], precautions:'', equipment:'', difficulty:'', sets:1, repetitions:10, rest:'', maxPain:3, tags:[], notes:'', media:{type:'none'}, status:'active', source:'local', createdAt, updatedAt:createdAt }],
    clinicalRecords: [], clinicalRecordVersions: [],
    sessions: [{
      id:'session-1', patientId:'patient-1', planId:'plan-1', startedAt:'2026-07-24T09:00:00.000Z', completedAt:'2026-07-24T09:30:00.000Z', status:'completed',
      startPain:3,startEnergy:7,startComment:'',exercises:{},endPain:2,endEnergy:6,effort:5,symptoms:[],comment:'',easiest:'',hardest:'',discomfort:'',durationMinutes:30,clinicalObservation:'',createdAt:'2026-07-24T09:30:00.000Z',updatedAt:'2026-07-24T09:30:00.000Z'
    }],
    notes: [], events: [],
    notifications: [
      { id:'notification-target', title:'Sesión lista', detail:'', severity:'attention', href:'/activity/session-1', read:false, createdAt },
      { id:'notification-other', title:'Otra', detail:'', severity:'attention', href:'/activity/session-2', read:false, createdAt },
    ],
    settings:{notifications:true,haptics:true,compact:true,professionalName:'Fisio',specialty:'Fisioterapia',clinic:'',sessionLock:true,clinicalPrivacy:true,aiSuggestions:true,aiAlerts:true,aiInstructions:''},
    feedback: [],
  };
}

function eventIds(...ids) { let index=0; return () => ids[index++] ?? `event-${index}`; }

test('canonical report review trims observation, marks the target notification and emits one review event', () => {
  const state = baseState();
  const { applyReviewSession } = sessionActions();
  const { session } = applyReviewSession(state,{ sessionId:'session-1', observation:'  Evolución favorable.  ', now:'2026-07-24T12:00:00.000Z', createEventId:eventIds('event-review') });
  assert.equal(session.clinicalObservation,'Evolución favorable.');
  assert.equal(session.reviewedAt,'2026-07-24T12:00:00.000Z');
  assert.equal(session.updatedAt,'2026-07-24T12:00:00.000Z');
  assert.equal(session.createdAt,'2026-07-24T09:30:00.000Z');
  assert.equal(state.notifications.find((item)=>item.id==='notification-target').read,true);
  assert.equal(state.notifications.find((item)=>item.id==='notification-other').read,false);
  assert.equal(state.events.length,1);
  assert.deepEqual(state.events[0],{
    id:'event-review',kind:'report_reviewed',patientId:'patient-1',planId:'plan-1',sessionId:'session-1',title:'Reporte revisado',detail:'Evolución favorable.',createdAt:'2026-07-24T12:00:00.000Z'
  });
});

test('canonical report review allows an empty observation and still marks the report reviewed', () => {
  const state = baseState();
  const { applyReviewSession } = sessionActions();
  const { session } = applyReviewSession(state,{ sessionId:'session-1', observation:'   ', now:'2026-07-24T12:10:00.000Z', createEventId:eventIds('event-empty') });
  assert.equal(session.clinicalObservation,'');
  assert.equal(session.reviewedAt,'2026-07-24T12:10:00.000Z');
  assert.equal(state.events[0].detail,'Sin observación adicional');
});

test('canonical report review rejects observations over 2000 characters atomically', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyReviewSession } = sessionActions();
  assert.throws(()=>applyReviewSession(state,{ sessionId:'session-1', observation:'x'.repeat(2001), now:'2026-07-24T12:20:00.000Z', createEventId:eventIds('event-too-long') }),/2000 caracteres/i);
  assert.deepEqual(state,before);
});

test('canonical report review rejects a missing session atomically', () => {
  const state = baseState();
  const before = structuredClone(state);
  const { applyReviewSession } = sessionActions();
  assert.throws(()=>applyReviewSession(state,{ sessionId:'missing', observation:'Nota', now:'2026-07-24T12:30:00.000Z', createEventId:eventIds('event-missing') }),/sesión ya no existe/i);
  assert.deepEqual(state,before);
});
