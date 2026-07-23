import type { CapabilityAICoverage } from './capabilityCatalog';

const covered = (capabilityId: string, readTools: string[] = [], actionTools: string[] = []): CapabilityAICoverage => ({
  capabilityId,
  readTools,
  actionTools,
  coverage: 'covered',
  gap: '',
  disposition: 'keep',
});

const partial = (capabilityId: string, gap: string, readTools: string[] = [], actionTools: string[] = []): CapabilityAICoverage => ({
  capabilityId,
  readTools,
  actionTools,
  coverage: 'partial',
  gap,
  disposition: 'build',
});

const missing = (capabilityId: string, gap: string): CapabilityAICoverage => ({
  capabilityId,
  readTools: [],
  actionTools: [],
  coverage: 'missing',
  gap,
  disposition: 'build',
});

const excluded = (capabilityId: string, gap: string): CapabilityAICoverage => ({
  capabilityId,
  readTools: [],
  actionTools: [],
  coverage: 'excluded',
  gap,
  disposition: 'exclude',
});

export const currentAICoverage: CapabilityAICoverage[] = [
  covered('patient.list-search', ['patient.search']),
  partial('patient.read', 'Current patient summary omits complete notes, session history, contact and record versions.', ['patient.summarize']),
  covered('patient.create', [], ['patient.create_with_record_and_plan']),
  partial('patient.update-demographics', 'The draft path updates only selected demographic and clinical fields.', [], ['patient_record.update']),
  missing('patient.update-contact', 'No AI tool updates canonical patient contact fields.'),
  missing('patient.archive-restore', 'No patient archive or restore tool is registered.'),
  covered('patient-note.create', [], ['patient_note.add']),
  missing('patient-note.update', 'No note update tool is registered.'),
  excluded('patient-note.delete', 'Destructive note deletion remains unavailable until a validated undo or retention policy exists.'),

  partial('clinical-record.read', 'Patient summary does not expose the complete canonical record.', ['patient.summarize']),
  partial('clinical-record.create', 'Creation exists only as part of combined patient and plan creation.', [], ['patient.create_with_record_and_plan']),
  covered('clinical-record.update', [], ['patient_record.update']),
  missing('clinical-record.read-history', 'No read tool exposes clinical record versions.'),

  missing('plan.list-search', 'No typed plan listing or search tool exists.'),
  partial('plan.read', 'Patient summary exposes only the active plan headline.', ['patient.summarize']),
  covered('plan.create', [], ['plan.create_for_patient']),
  partial('plan.update', 'Update adds materialized exercises but does not expose explicit remove or reorder operations.', [], ['plan.update']),
  missing('plan.duplicate', 'No plan duplicate tool exists.'),
  excluded('plan.delete-safe', 'Permanent plan deletion remains blocked; archive is the supported agent action.'),
  covered('plan.activate', [], ['plan.activate']),
  covered('plan.pause', [], ['plan.pause']),
  covered('plan.complete', [], ['plan.complete']),
  covered('plan.archive-restore', [], ['plan.archive', 'plan.restore']),
  covered('plan.replace-active', [], ['plan.replace_active']),
  partial('plan.add-exercises', 'Plan update can add exercises but lacks explicit membership semantics.', [], ['plan.update']),
  missing('plan.remove-exercises', 'No plan membership removal tool exists.'),
  missing('plan.reorder-exercises', 'No plan exercise reorder tool exists.'),

  missing('exercise.list-search', 'No typed exercise search/list tool exists.'),
  missing('exercise.read', 'No typed exercise detail read tool exists.'),
  covered('exercise.create', [], ['exercise.create']),
  covered('exercise.update', [], ['exercise.update']),
  missing('exercise.duplicate', 'No exercise duplicate tool exists.'),
  missing('exercise.archive-restore', 'No exercise archive or restore tool exists.'),
  excluded('exercise.delete-safe', 'Permanent exercise deletion remains unavailable through Atal IA.'),
  missing('exercise.update-media', 'No tool uses the canonical local media repository.'),

  missing('session.prepare', 'No read tool assembles the active session snapshot.'),
  missing('session.start-resume', 'No agent tool starts or resumes a guided session.'),
  missing('session.record-exercise-result', 'No agent tool writes guided-session exercise outcomes.'),
  missing('session.record-symptoms', 'No agent tool writes pain, effort, energy or symptoms.'),
  missing('session.complete', 'No agent tool completes or persists a session.'),

  partial('report.list', 'Recent-session summary is patient-scoped and does not list activity or audit history.', ['session.summarize_recent']),
  partial('report.read', 'Session summary returns a limited sentence instead of complete report data.', ['report.prepare_session_summary']),
  covered('report.prepare-summary', ['report.prepare_session_summary']),
  missing('report.review', 'No tool persists the physiotherapist review or clinical observation.'),
  missing('activity.read-audit', 'No tool queries transaction and activity audit entries.'),

  missing('delivery.preview', 'No tool builds the patient-delivery read model.'),
  missing('delivery.configure', 'No tool persists delivery configuration.'),
  missing('delivery.generate-pdf', 'No tool invokes the canonical local PDF generator.'),
  missing('delivery.download-print-share', 'No approved client-effect tool exposes delivery actions.'),
  excluded('delivery.prepare-whatsapp', 'Automatic or external messaging remains excluded; a separately confirmed URL-opening client effect may be evaluated later.'),
  covered('export.patients', [], ['data.export_local']),
  covered('export.progress', [], ['data.export_local']),
  covered('export.plans-backup', [], ['data.export_local']),

  missing('settings.read', 'No typed read tool returns profile and settings.'),
  partial('settings.update-profile', 'The existing settings tool intentionally excludes professional profile fields.', [], ['settings.update']),
  covered('settings.update-privacy', [], ['settings.update']),
  partial('settings.update-appearance', 'Theme selection is not represented by the current settings tool.', [], ['settings.update']),
  covered('settings.update-ai-preferences', [], ['settings.update']),
  excluded('feedback.prepare-share', 'External feedback sharing is outside the clinical agent parity target.'),

  missing('navigation.open-screen', 'No navigation client-effect tool resolves and opens routes.'),
  covered('navigation.open-contextual-assistant'),
  partial('assistant.resume-task', 'Conversation and draft persist, but multi-step execution checkpoints and attachment artifacts do not.'),
];
