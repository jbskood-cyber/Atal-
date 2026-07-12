import { exercises } from '@/src/data/atal-demo';
import type { GuidedPlan } from './types';

export const guidedDemoPlan: GuidedPlan = {
  id: 'guided-pl01',
  name: 'Rehabilitación funcional — Fase 1',
  estimatedDuration: '18–22 minutos',
  therapistMessage: 'Hoy trabajaremos control, fuerza suave y movilidad. Prioriza calidad antes que velocidad.',
  generalInstructions: 'Respira con normalidad, evita compensaciones y respeta el rango que te indicó tu fisioterapeuta.',
  exercises: [
    {
      id: 'guided-e01', name: 'Puente de glúteos', region: 'Cadera y zona lumbar', objective: 'Activar glúteos y mejorar el control de pelvis', sets: 3, repetitions: 10, restSeconds: 35, maxPain: 3, equipment: 'Tapete', startingPosition: 'Acuéstate boca arriba con rodillas flexionadas y pies apoyados al ancho de la cadera.', instructions: ['Activa suavemente el abdomen.', 'Eleva la pelvis sin arquear la espalda.', 'Sostén un segundo y desciende lentamente.'], precautions: 'Detente si el dolor baja por la pierna o aparece mareo.', therapistCue: 'Mantén las rodillas alineadas y el movimiento tranquilo.', media: { type: 'image', url: exercises[2].image },
    },
    {
      id: 'guided-e02', name: 'Bird Dog controlado', region: 'Columna', objective: 'Mejorar estabilidad lumbopélvica', sets: 3, repetitions: 8, restSeconds: 40, maxPain: 3, equipment: 'Tapete', startingPosition: 'Colócate en cuatro puntos, manos bajo hombros y rodillas bajo cadera.', instructions: ['Alarga brazo y pierna contraria.', 'Evita girar la pelvis.', 'Regresa con control y cambia de lado.'], precautions: 'Reduce el alcance si pierdes estabilidad o aparece dolor.', therapistCue: 'Imagina un vaso sobre tu espalda: evita que se incline.', media: { type: 'none' },
    },
    {
      id: 'guided-e03', name: 'Estiramiento de isquiotibiales', region: 'Muslo posterior', objective: 'Recuperar movilidad sin irritar el tejido', sets: 2, seconds: 30, restSeconds: 20, maxPain: 2, equipment: 'Toalla opcional', startingPosition: 'Acuéstate boca arriba y eleva una pierna con la rodilla ligeramente flexionada.', instructions: ['Sujeta la pierna sin forzar.', 'Mantén una tensión cómoda.', 'Respira y cambia de lado al terminar.'], precautions: 'No rebotes ni busques dolor intenso.', therapistCue: 'Debe sentirse como tensión suave, nunca como ardor o descarga.', media: { type: 'image', url: exercises[9].image },
    },
  ],
};
