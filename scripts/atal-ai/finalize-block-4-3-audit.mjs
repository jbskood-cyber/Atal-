import { readFileSync, writeFileSync } from 'node:fs';

const inventoryPath = 'src/features/atal-ai/core/audit/manualCapabilityInventory.ts';
let inventory = readFileSync(inventoryPath, 'utf8');
const replacements = [
  ['src/features/exercises/mediaRepository.ts#saveExerciseMedia', 'src/data/exerciseMediaRepository.ts#saveExerciseMedia'],
  ['src/features/guided-session/SessionPreparation.tsx#SessionPreparation', 'src/features/guided-session/planResolver.ts#resolvePatientPlan'],
  ['src/data/atalStore.ts#recordSessionStarted', 'src/features/guided-session/sessionRepository.ts#recordClinicalSessionStarted'],
  ['src/data/atalStore.ts#saveCompletedSession', 'src/features/guided-session/sessionRepository.ts#saveCompletedClinicalSession'],
  ['src/features/patient-delivery/deliveryConfiguration.ts#normalizeDeliveryConfiguration', 'src/features/patient-delivery/deliveryOptions.ts#normalizePatientPlanDeliveryOptions'],
  ['src/features/patient-delivery/pdf/generatePatientPlanPdf.ts#generatePatientPlanPdf', 'src/features/patient-delivery/pdfRouter.ts#createPatientPlanPdf'],
  ['src/features/atal-ai/core/tools/exportTools.ts#data.export_local', 'src/features/atal-ai/core/tools/exportTools.ts#exportTools'],
  ['src/features/atal-ai/core/tools/queryTools.ts#report.prepare_session_summary', 'src/features/atal-ai/core/tools/queryTools.ts#queryTools'],
  ['src/context/ThemeContext.tsx#setTheme', 'src/context/ThemeContext.tsx#ThemeProvider'],
];
for (const [before, after] of replacements) inventory = inventory.replaceAll(before, after);
writeFileSync(inventoryPath, inventory, 'utf8');
console.log('Finalized capability entry points.');
