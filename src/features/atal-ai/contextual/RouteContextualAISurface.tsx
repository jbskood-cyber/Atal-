'use client';

import { usePathname } from 'next/navigation';
import { useAtalStore } from '@/src/data/atalStore';
import { ContextualAISurface } from './ContextualAISurface';
import type { ContextualAIContext } from './types';

function decodeId(value: string | undefined) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

export function RouteContextualAISurface() {
  const pathname = usePathname() ?? '';
  const state = useAtalStore((store) => store);
  let context: ContextualAIContext | null = null;

  const planMatch = pathname.match(/^\/plans\/([^/]+)$/);
  if (planMatch) {
    const planId = decodeId(planMatch[1]);
    if (planId !== 'new') {
      const plan = state.plans.find((item) => item.id === planId);
      const patient = plan ? state.patients.find((item) => item.id === plan.patientId) : null;
      if (plan) {
        context = {
          surface: 'plan',
          route: pathname,
          patientId: plan.patientId,
          clinicalRecordId: state.clinicalRecords.find((item) => item.patientId === plan.patientId)?.id ?? '',
          clinicalRecordVersion: state.clinicalRecords.find((item) => item.patientId === plan.patientId)?.version ?? null,
          planId: plan.id,
          exerciseId: '',
          sessionId: '',
          reportId: '',
          contextLabel: 'en este plan',
          entityLabel: `${plan.title}${patient ? ` · ${patient.name}` : ''}`,
        };
      }
    }
  }

  const exerciseMatch = pathname.match(/^\/exercises\/([^/]+)$/);
  if (!context && exerciseMatch) {
    const exerciseId = decodeId(exerciseMatch[1]);
    if (exerciseId !== 'new') {
      const exercise = state.exercises.find((item) => item.id === exerciseId);
      const matchingPlans = exercise ? state.plans.filter((item) => item.exerciseIds.includes(exercise.id) && item.status !== 'archived') : [];
      const plan = matchingPlans.find((item) => item.status === 'active') ?? matchingPlans[0];
      const patient = plan ? state.patients.find((item) => item.id === plan.patientId) : null;
      if (exercise) {
        context = {
          surface: 'exercise',
          route: pathname,
          patientId: patient?.id ?? '',
          clinicalRecordId: patient ? state.clinicalRecords.find((item) => item.patientId === patient.id)?.id ?? '' : '',
          clinicalRecordVersion: patient ? state.clinicalRecords.find((item) => item.patientId === patient.id)?.version ?? null : null,
          planId: plan?.id ?? '',
          exerciseId: exercise.id,
          sessionId: '',
          reportId: '',
          contextLabel: 'en este ejercicio',
          entityLabel: exercise.name,
        };
      }
    }
  }

  const reportMatch = pathname.match(/^\/activity\/([^/]+)$/);
  if (!context && reportMatch) {
    const sessionId = decodeId(reportMatch[1]);
    const session = state.sessions.find((item) => item.id === sessionId);
    const patient = session ? state.patients.find((item) => item.id === session.patientId) : null;
    if (session) {
      context = {
        surface: 'report',
        route: pathname,
        patientId: session.patientId,
        clinicalRecordId: state.clinicalRecords.find((item) => item.patientId === session.patientId)?.id ?? '',
        clinicalRecordVersion: state.clinicalRecords.find((item) => item.patientId === session.patientId)?.version ?? null,
        planId: session.planId,
        exerciseId: '',
        sessionId: session.id,
        reportId: session.id,
        contextLabel: 'en este reporte',
        entityLabel: patient ? `Sesión de ${patient.name}` : 'Reporte de sesión',
      };
    }
  }

  return context ? <ContextualAISurface context={context} /> : null;
}
