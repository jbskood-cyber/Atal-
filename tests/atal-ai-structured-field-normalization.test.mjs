import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/core-modules.mjs';

const hygiene = () => loadCore('src/features/atal-ai/core/agentic/structuredFieldHygiene.js');

test('normalizes obvious narrative wrappers before structured tool execution', () => {
  const { normalizeStructuredToolInput } = hygiene();

  const patient = normalizeStructuredToolInput('patient.create', {
    patient: {
      name: 'El nombre del paciente es Francisco López',
      phone: 'El teléfono es 4441234567',
      email: 'El correo es francisco@example.com',
      affectedArea: 'La zona afectada es hombro derecho',
    },
    record: {
      reasonForVisit: 'El motivo de consulta es dolor de hombro al elevar el brazo',
      affectedArea: 'La zona afectada es hombro derecho',
      providedDiagnosis: 'El diagnóstico proporcionado es tendinopatía del manguito rotador',
    },
    plan: {
      title: 'El título del plan es Recuperación de hombro',
      focus: 'El enfoque del plan es movilidad y fortalecimiento progresivo',
      duration: 'La duración es 6 semanas',
      frequency: 'La frecuencia es 3 veces por semana',
      goal: 'El objetivo es recuperar movilidad sin dolor',
    },
  });

  assert.equal(patient.patient.name, 'Francisco López');
  assert.equal(patient.patient.phone, '4441234567');
  assert.equal(patient.patient.email, 'francisco@example.com');
  assert.equal(patient.patient.affectedArea, 'hombro derecho');
  assert.equal(patient.record.reasonForVisit, 'dolor de hombro al elevar el brazo');
  assert.equal(patient.record.affectedArea, 'hombro derecho');
  assert.equal(patient.record.providedDiagnosis, 'tendinopatía del manguito rotador');
  assert.equal(patient.plan.title, 'Recuperación de hombro');
  assert.equal(patient.plan.focus, 'movilidad y fortalecimiento progresivo');
  assert.equal(patient.plan.duration, '6 semanas');
  assert.equal(patient.plan.frequency, '3 veces por semana');
  assert.equal(patient.plan.goal, 'recuperar movilidad sin dolor');
});

test('normalizes exercise, duplicate and professional-profile wrappers without touching references', () => {
  const { normalizeStructuredToolInput } = hygiene();

  const exercise = normalizeStructuredToolInput('exercise.create_simple', {
    name: 'El nombre del ejercicio es Rotación externa con banda',
    region: 'La región es hombro',
    category: 'La categoría es fortalecimiento',
    objective: 'El objetivo es mejorar fuerza del manguito rotador',
    startingPosition: 'La posición inicial es de pie con el codo junto al cuerpo',
    instructions: ['La instrucción es rotar el antebrazo hacia afuera sin separar el codo'],
    precautions: 'La precaución es detenerse si aparece dolor agudo',
  });
  assert.equal(exercise.name, 'Rotación externa con banda');
  assert.equal(exercise.region, 'hombro');
  assert.equal(exercise.category, 'fortalecimiento');
  assert.equal(exercise.objective, 'mejorar fuerza del manguito rotador');
  assert.equal(exercise.startingPosition, 'de pie con el codo junto al cuerpo');
  assert.deepEqual(exercise.instructions, ['rotar el antebrazo hacia afuera sin separar el codo']);
  assert.equal(exercise.precautions, 'detenerse si aparece dolor agudo');

  const duplicate = normalizeStructuredToolInput('plan.duplicate', {
    plan: { type: 'plan', id: 'plan-e2e', label: 'Plan original' },
    title: 'El título de la copia es Plan hombro avanzado',
  });
  assert.deepEqual(duplicate.plan, { type: 'plan', id: 'plan-e2e', label: 'Plan original' });
  assert.equal(duplicate.title, 'Plan hombro avanzado');

  const profile = normalizeStructuredToolInput('settings.profile_update', {
    professionalName: 'El nombre profesional es Dra. Ana Pérez',
    specialty: 'La especialidad es fisioterapia deportiva',
    clinic: 'La clínica es Centro Movimiento',
  });
  assert.equal(profile.professionalName, 'Dra. Ana Pérez');
  assert.equal(profile.specialty, 'fisioterapia deportiva');
  assert.equal(profile.clinic, 'Centro Movimiento');
});

test('keeps structured dose fields out of exercise instructions when Gemini repeats the dose in prose', () => {
  const { normalizeStructuredToolInput } = hygiene();

  const created = normalizeStructuredToolInput('exercise.create_simple', {
    name: 'Rotación externa con banda',
    sets: 4,
    repetitions: 10,
    instructions: ['4 series de 10 repeticiones. Mantén el codo pegado al cuerpo'],
  });
  assert.equal(created.sets, 4);
  assert.equal(created.repetitions, 10);
  assert.deepEqual(created.instructions, ['Mantén el codo pegado al cuerpo']);

  const updated = normalizeStructuredToolInput('exercise.update_fields', {
    exercise: { type: 'exercise', id: 'exercise-e2e', label: 'Rotación externa con banda' },
    patch: {
      sets: 5,
      repetitions: 8,
      instructions: ['5 series de 8 repeticiones; rota sin compensar el tronco'],
    },
  });
  assert.deepEqual(updated.exercise, { type: 'exercise', id: 'exercise-e2e', label: 'Rotación externa con banda' });
  assert.equal(updated.patch.sets, 5);
  assert.equal(updated.patch.repetitions, 8);
  assert.deepEqual(updated.patch.instructions, ['rota sin compensar el tronco']);
});
