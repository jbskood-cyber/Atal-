import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const sessionActions = () => loadCore('src/domain/actions/sessionActions.js');

function baseState() {
  const createdAt = '2026-07-24T10:00:00.000Z';
  return {
    version: 2, seededAt: createdAt, updatedAt: createdAt,
    patients: [{ id:'patient-1', name:'Paciente', diagnosis:'Rodilla', age:30, birthDate:'', sex:'', affectedArea:'Rodilla', status:'active', visitType:'followup', contact:{phone:'',email:'',address:'',emergencyContact:''}, createdAt, updatedAt:createdAt }],
    plans: [{ id:'plan-1', patientId:'patient-1', title:'Plan', focus:'', duration:'', frequency:'', goal:'', exerciseIds:['exercise-1'], status:'active', progression:'', reportCriteria:'', generalInstructions:'', createdAt, updatedAt:createdAt }],
    exercises: [{ id:'exercise-1', name:'Ejercicio', region:'Rodilla', category:'Movilidad', objective:'', startingPosition:'', instructions:['Mover'], precautions:'', equipment:'', difficulty:'', sets:1, repetitions:10, rest:'', maxPain:3, tags:[], notes:'', media:{type:'none'}, status:'active', source:'local', createdAt, updatedAt:createdAt }],
    clinicalRecords: [], clinicalRecordVersions: [], sessions: [], notes: [], events: [], notifications: [],
    settings:{notifications:true,haptics:true,compact:true,professionalName:'Fisio',specialty:'Fisioterapia',clinic:'',sessionLock:true,clinicalPrivacy:true,aiSuggestions:true,aiAlerts:true,aiInstructions:''}, feedback: [],
  };
}

function draft(overrides = {}) {
  return {
    version: 2, patientId:'patient-1', planId:'plan-1', status:'completed', stage:'summary', currentExerciseIndex:0,
    startedAt:'2026-07-24T11:00:00.000Z', completedAt:'2026-07-24T11:30:00.000Z',
    planSnapshot:{ id:'plan-1', status:'active', name:'Plan', therapistMessage:'', estimatedDuration:'30 min', generalInstructions:'', exercises:[] },
    start:{pain:3,energy:7,comment:'Inicio'}, exercises:{'exercise-1':{result:'completed',sets:[{completed:true,repetitions:10}]}},
    end:{pain:5,energy:6,effort:6,symptoms:['ninguno'],comment:'Bien',easiest:'Ejercicio',hardest:'',discomfort:''},
    ...overrides,
  };
}

function ids(prefix) { let index = 0; return () => `${prefix}-${++index}`; }

test('canonical session start validates ownership and emits the start event once', () => {
  const state = baseState();
  const { applyRecordSessionStarted } = sessionActions();
  applyRecordSessionStarted(state,{patientId:'patient-1',planId:'plan-1',startedAt:'2026-07-24T11:00:00.000Z',createEventId:ids('event')});
  applyRecordSessionStarted(state,{patientId:'patient-1',planId:'plan-1',startedAt:'2026-07-24T11:00:00.000Z',createEventId:ids('duplicate')});
  assert.equal(state.events.length,1);
  assert.equal(state.events[0].kind,'session_started');
  assert.equal(state.events[0].createdAt,'2026-07-24T11:00:00.000Z');
});

test('canonical session completion persists metrics snapshot event and notification idempotently', () => {
  const state = baseState();
  const { applyCompleteSession } = sessionActions();
  const first = applyCompleteSession(state,{patientId:'patient-1',planId:'plan-1',draft:draft(),now:'2026-07-24T11:30:00.000Z',createSessionId:ids('session'),createEventId:ids('event'),createNotificationId:ids('notification')});
  assert.equal(first.created,true);
  assert.equal(first.session.status,'completed');
  assert.equal(first.session.durationMinutes,30);
  assert.equal(first.session.startPain,3);
  assert.equal(first.session.endPain,5);
  assert.equal(first.session.effort,6);
  assert.equal(first.session.planSnapshot.name,'Plan');
  assert.equal(state.events[0].kind,'session_completed');
  assert.equal(state.notifications[0].severity,'attention');
  const second = applyCompleteSession(state,{patientId:'patient-1',planId:'plan-1',draft:draft(),now:'2026-07-24T11:31:00.000Z',createSessionId:ids('session-duplicate'),createEventId:ids('event-duplicate'),createNotificationId:ids('notification-duplicate')});
  assert.equal(second.created,false);
  assert.equal(state.sessions.length,1);
  assert.equal(state.events.length,1);
  assert.equal(state.notifications.length,1);
});

test('canonical session completion rejects patient-plan ownership mismatch with zero mutation', () => {
  const state = baseState();
  state.plans[0].patientId = 'patient-other';
  const before = structuredClone(state);
  const { applyCompleteSession } = sessionActions();
  assert.throws(() => applyCompleteSession(state,{patientId:'patient-1',planId:'plan-1',draft:draft(),now:'2026-07-24T11:30:00.000Z',createSessionId:ids('session'),createEventId:ids('event'),createNotificationId:ids('notification')}),/no pertenece al paciente/i);
  assert.deepEqual(state,before);
});
