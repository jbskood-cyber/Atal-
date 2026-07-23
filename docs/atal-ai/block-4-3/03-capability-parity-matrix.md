# Block 4.3 — Capability parity matrix

Generated from branch `feature/atal-ai-agentic-audit-block-4-3`.

## Summary

- Total manual capabilities: **62**
- Approved in-scope capabilities: **57**
- Covered: **57**
- Partial: **0**
- Missing: **0**
- Deliberately excluded: **5**
- Total matrix coverage, including exclusions: **92%**
- Approved agentic parity: **100%**

Approved agentic parity excludes only operations deliberately unavailable for product, safety or retention reasons. An exclusion is not treated as an implementation failure and remains visibly blocked.

## Matrix

| ID | Domain | Manual capability | Route | Canonical path | Persistence | AI reads | AI actions | Coverage | Risk | Confirmation | Audit | Undo | Gap / disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| patient.list-search | patients | Listar y buscar pacientes | /patients | src/data/atalStore.ts#getAtalState | patients | patient.search | — | covered | read | none | none | not-applicable | keep |
| patient.read | patients | Consultar perfil de paciente | /patients/:id | src/screens/PatientProfileScreen.tsx#PatientProfileScreen | patients, notes, plans, sessions | app.read | — | covered | read | none | none | not-applicable | keep |
| patient.create | patients | Crear paciente y expediente inicial | /patients/new | src/data/atalStore.ts#createPatientWithRecord | patients, clinicalRecords, events | — | patient.create | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| patient.update-demographics | patients | Actualizar datos generales del paciente | /patients/:id | src/data/atalStore.ts#updatePatient | patients, events | — | patient.update | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| patient.update-contact | patients | Actualizar teléfono, correo, dirección y contacto responsable | /patients/:id | src/data/atalStore.ts#updatePatient | patients, events | — | patient.update | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| patient.archive-restore | patients | Archivar o restaurar paciente | /patients/:id | src/data/atalStore.ts#setPatientArchived | patients, plans, events | — | patient.lifecycle | covered | sensitive-write | short-confirmation | activity-event | manual-compensation | keep |
| patient-note.create | patients | Añadir nota al paciente | /patients/:id | src/data/atalStore.ts#addPatientNote | notes, events | — | patient_note.add | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| patient-note.update | patients | Editar nota del paciente | /patients/:id | src/data/atalStore.ts#updatePatientNote | notes | — | patient_note.update | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| patient-note.delete | patients | Eliminar nota del paciente | /patients/:id | src/data/atalStore.ts#deletePatientNote | notes | — | — | excluded | destructive | reinforced-confirmation | none | not-supported | Permanent note deletion remains unavailable until a validated retention and recovery policy exists. |
| clinical-record.read | clinical-records | Consultar expediente clínico | /patients/:id/clinical-record | src/features/clinical-record/ClinicalRecordScreen.tsx#ClinicalRecordScreen | clinicalRecords | app.read | — | covered | read | none | none | not-applicable | keep |
| clinical-record.create | clinical-records | Crear expediente clínico | /patients/:id/clinical-record | src/data/atalStore.ts#saveClinicalRecord | clinicalRecords, events | — | clinical_record.upsert | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| clinical-record.update | clinical-records | Actualizar expediente y crear versión | /patients/:id/clinical-record | src/data/atalStore.ts#saveClinicalRecord | clinicalRecords, clinicalRecordVersions, events | — | clinical_record.upsert | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| clinical-record.read-history | clinical-records | Consultar versiones anteriores del expediente | /patients/:id/clinical-record | src/data/atalStore.ts#getAtalState | clinicalRecordVersions | app.read | — | covered | read | none | none | not-applicable | keep |
| plan.list-search | plans | Listar y filtrar planes | /plans | src/data/atalStore.ts#getAtalState | plans | app.read | — | covered | read | none | none | not-applicable | keep |
| plan.read | plans | Consultar plan y prescripción | /plans/:id | src/screens/PlanDetailCloseoutScreen.tsx#PlanDetailCloseoutScreen | plans, exercises | app.read | — | covered | read | none | none | not-applicable | keep |
| plan.create | plans | Crear plan para paciente | /plans/new | src/data/atalStore.ts#createPlan | plans, clinicalRecords, events | — | plan.create_simple | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| plan.update | plans | Editar plan clínico | /plans/:id | src/data/atalStore.ts#updatePlan | plans, events | — | plan.update_fields | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| plan.duplicate | plans | Duplicar plan como borrador | /plans/:id | src/data/atalStore.ts#duplicatePlan | plans, events | — | plan.duplicate | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| plan.delete-safe | plans | Eliminar plan sin sesiones | /plans/:id | src/data/atalStore.ts#deletePlan | plans | — | — | excluded | destructive | reinforced-confirmation | none | not-supported | Permanent plan deletion remains unavailable; archive is the supported clinical retention path. |
| plan.activate | plans | Activar plan | /plans/:id | src/data/atalStore.ts#updatePlanStatus | plans, events, notifications | — | plan.activate | covered | sensitive-write | short-confirmation | transaction-event | validated-receipt | keep |
| plan.pause | plans | Pausar plan activo | /plans/:id | src/data/atalStore.ts#updatePlanStatus | plans, events | — | plan.pause | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| plan.complete | plans | Completar plan | /plans/:id | src/data/atalStore.ts#updatePlanStatus | plans, events | — | plan.complete | covered | sensitive-write | short-confirmation | transaction-event | validated-receipt | keep |
| plan.archive-restore | plans | Archivar o restaurar plan | /plans/:id | src/data/atalStore.ts#updatePlanStatus | plans, events | — | plan.archive, plan.restore | covered | sensitive-write | short-confirmation | transaction-event | validated-receipt | keep |
| plan.replace-active | plans | Reemplazar plan activo de forma atómica | /plans/:id | src/data/atalStore.ts#updatePlanStatus | plans, events, notifications | — | plan.replace_active | covered | sensitive-write | short-confirmation | transaction-event | validated-receipt | keep |
| plan.add-exercises | plans | Añadir ejercicios al plan | /plans/:id | src/data/atalStore.ts#updatePlan | plans | — | plan.membership | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| plan.remove-exercises | plans | Retirar ejercicios del plan | /plans/:id | src/data/atalStore.ts#updatePlan | plans | — | plan.membership | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| plan.reorder-exercises | plans | Reordenar ejercicios del plan | /plans/:id | src/data/atalStore.ts#updatePlan | plans | — | plan.membership | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| exercise.list-search | exercises | Listar, buscar y filtrar ejercicios | /exercises | src/data/atalStore.ts#getAtalState | exercises | app.read | — | covered | read | none | none | not-applicable | keep |
| exercise.read | exercises | Consultar ejercicio y prescripción | /exercises/:id | src/screens/ExerciseDetailScreen.tsx#ExerciseDetailScreen | exercises | app.read | — | covered | read | none | none | not-applicable | keep |
| exercise.create | exercises | Crear ejercicio | /exercises/new | src/data/atalStore.ts#createExercise | exercises, events | — | exercise.create_simple | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| exercise.update | exercises | Editar ejercicio | /exercises/:id | src/data/atalStore.ts#updateExercise | exercises | — | exercise.update_fields | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| exercise.duplicate | exercises | Duplicar ejercicio | /exercises/:id | src/data/atalStore.ts#duplicateExercise | exercises, events | — | exercise.duplicate | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| exercise.archive-restore | exercises | Archivar o restaurar ejercicio | /exercises/:id | src/data/atalStore.ts#archiveExercise | exercises | — | exercise.lifecycle | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| exercise.delete-safe | exercises | Eliminar ejercicio no asociado | /exercises/:id | src/data/atalStore.ts#deleteExercise | exercises | — | — | excluded | destructive | reinforced-confirmation | none | not-supported | Permanent exercise deletion remains unavailable through Atal IA. |
| exercise.update-media | exercises | Añadir o sustituir multimedia del ejercicio | /exercises/:id | src/data/exerciseMediaRepository.ts#saveExerciseMedia | exercises, IndexedDB media | — | exercise.media | covered | reversible-write | compact-review | none | manual-compensation | keep |
| session.prepare | sessions | Preparar sesión guiada desde plan activo | /patients/:id/session | src/features/guided-session/planResolver.ts#resolvePatientPlan | guided session draft | app.read | — | covered | read | none | none | not-applicable | keep |
| session.start-resume | sessions | Iniciar o reanudar sesión guiada | /patients/:id/session | src/features/guided-session/sessionRepository.ts#recordClinicalSessionStarted | events, guided session draft | — | session.start_or_resume | covered | reversible-write | explicit-request | activity-event | not-supported | keep |
| session.record-exercise-result | sessions | Registrar resultado de cada ejercicio | /patients/:id/session | src/features/guided-session/GuidedSessionFlow.tsx#GuidedSessionFlow | guided session draft | — | session.update_draft | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| session.record-symptoms | sessions | Registrar dolor, energía, esfuerzo y síntomas | /patients/:id/session | src/features/guided-session/GuidedSessionFlow.tsx#GuidedSessionFlow | guided session draft | — | session.update_draft | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| session.complete | sessions | Completar o guardar sesión parcial | /patients/:id/session | src/features/guided-session/sessionRepository.ts#saveCompletedClinicalSession | sessions, events, notifications | — | session.complete | covered | sensitive-write | short-confirmation | activity-event | not-supported | keep |
| report.list | reports-activity | Listar actividad y reportes | /activity | src/data/atalStore.ts#getAtalState | events, sessions | app.read | — | covered | read | none | none | not-applicable | keep |
| report.read | reports-activity | Consultar reporte clínico de sesión | /activity/:id | src/screens/ActivityDetailScreen.tsx#ActivityDetailScreen | sessions | app.read | — | covered | read | none | none | not-applicable | keep |
| report.prepare-summary | reports-activity | Preparar resumen de sesión | /activity/:id | src/features/atal-ai/core/tools/queryTools.ts#queryTools | sessions | report.prepare_session_summary | — | covered | read | none | none | not-applicable | keep |
| report.review | reports-activity | Revisar reporte y guardar observación clínica | /activity/:id | src/data/atalStore.ts#reviewSession | sessions, events, notifications | — | report.review | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| activity.read-audit | reports-activity | Consultar historial y auditoría de Atal IA | /activity | src/data/atalStore.ts#getAtalState | events | app.read | — | covered | read | none | none | not-applicable | keep |
| delivery.preview | delivery-exports | Previsualizar entrega del plan | /plans/:id/delivery | src/screens/PatientPlanDeliveryScreen.tsx#PatientPlanDeliveryScreen | plans, patients, exercises | app.read, delivery.open | — | covered | read | none | none | not-applicable | keep |
| delivery.configure | delivery-exports | Configurar plan, registro y sesiones | /plans/:id/delivery | src/features/patient-delivery/deliveryOptions.ts#normalizePatientPlanDeliveryOptions | delivery draft | — | delivery.action | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| delivery.generate-pdf | delivery-exports | Generar PDF local | /plans/:id/delivery | src/features/patient-delivery/pdfRouter.ts#createPatientPlanPdf | local file | — | delivery.action | covered | sensitive-write | short-confirmation | client-effect-only | not-supported | keep |
| delivery.download-print-share | delivery-exports | Descargar, imprimir o compartir PDF | /plans/:id/delivery | src/screens/PatientPlanDeliveryScreen.tsx#PatientPlanDeliveryScreen | local file | — | delivery.action | covered | external | short-confirmation | client-effect-only | not-supported | keep |
| delivery.prepare-whatsapp | delivery-exports | Preparar apertura de WhatsApp con mensaje | /plans/:id/delivery | src/features/patient-delivery/whatsapp.ts#createWhatsAppDeliveryUrl | none | — | — | excluded | external | short-confirmation | client-effect-only | not-supported | Automatic external messaging remains outside the approved local agent boundary. |
| export.patients | delivery-exports | Exportar pacientes | /exports | src/features/atal-ai/core/tools/exportTools.ts#exportTools | local file | — | data.export_local | covered | sensitive-write | short-confirmation | client-effect-only | not-supported | keep |
| export.progress | delivery-exports | Exportar progreso | /exports | src/features/atal-ai/core/tools/exportTools.ts#exportTools | local file | — | data.export_local | covered | sensitive-write | short-confirmation | client-effect-only | not-supported | keep |
| export.plans-backup | delivery-exports | Exportar planes o respaldo local | /exports | src/features/atal-ai/core/tools/exportTools.ts#exportTools | local file | — | data.export_local | covered | sensitive-write | short-confirmation | client-effect-only | not-supported | keep |
| settings.read | profile-settings | Consultar preferencias y perfil profesional | /settings | src/data/atalStore.ts#getAtalState | settings | app.read | — | covered | read | none | none | not-applicable | keep |
| settings.update-profile | profile-settings | Actualizar perfil profesional | /settings/profile | src/data/atalStore.ts#updateSettings | settings | — | settings.profile_update | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| settings.update-privacy | profile-settings | Actualizar privacidad y bloqueo de sesión | /settings/privacy | src/data/atalStore.ts#updateSettings | settings | — | settings.update | covered | reversible-write | explicit-request | activity-event | manual-compensation | keep |
| settings.update-appearance | profile-settings | Actualizar apariencia y densidad | /settings/appearance | src/context/ThemeContext.tsx#ThemeProvider | theme preference, settings | — | settings.appearance | covered | reversible-write | explicit-request | none | manual-compensation | keep |
| settings.update-ai-preferences | profile-settings | Actualizar preferencias de Atal IA | /settings/ai | src/data/atalStore.ts#updateSettings | settings | — | settings.update | covered | reversible-write | explicit-request | transaction-event | validated-receipt | keep |
| feedback.prepare-share | profile-settings | Preparar y compartir comentario | /settings/feedback | src/data/atalStore.ts#addFeedback | feedback | — | — | excluded | external | short-confirmation | client-effect-only | not-supported | External feedback sharing is outside the clinical agent parity target. |
| navigation.open-screen | navigation-assistance | Abrir una pantalla o entidad solicitada | * | src/AppCloseout.tsx#PrivateAppRoutes | none | navigation.open | — | covered | read | none | none | not-applicable | keep |
| navigation.open-contextual-assistant | navigation-assistance | Abrir Atal IA con contexto actual | * | src/features/atal-ai/contextual/ContextualAIProvider.tsx#ContextualAIProvider | AI conversations | — | — | covered | read | none | none | not-applicable | keep |
| assistant.resume-task | navigation-assistance | Reanudar conversación y tarea pendiente | /assistant | src/features/atal-ai/data/aiRepository.ts#getLatestAIConversation | AI conversations, AI drafts | — | — | covered | read | none | none | not-applicable | keep |

## Interpretation

- `covered` means the current AI path reaches the same canonical outcome with the required safeguards.
- `partial` means an existing path omits part of the manual outcome or required persistence/safety behavior.
- `missing` means a new read or action tool is required.
- `excluded` means the current product deliberately blocks the operation and documents the reason.

