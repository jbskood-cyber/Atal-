import type { CapabilityAICoverage } from './capabilityCatalog';

const covered = (capabilityId: string, readTools: string[] = [], actionTools: string[] = []): CapabilityAICoverage => ({
  capabilityId,
  readTools,
  actionTools,
  coverage: 'covered',
  gap: '',
  disposition: 'keep',
});

const excluded = (capabilityId: string, reason: string): CapabilityAICoverage => ({
  capabilityId,
  readTools: [],
  actionTools: [],
  coverage: 'excluded',
  gap: reason,
  disposition: 'exclude',
});

export const currentAICoverage: CapabilityAICoverage[] = [
  covered('patient.list-search', ['patient.search']),
  covered('patient.read', ['app.read']),
  covered('patient.create', [], ['patient.create']),
  covered('patient.update-demographics', [], ['patient.update']),
  covered('patient.update-contact', [], ['patient.update']),
  covered('patient.archive-restore', [], ['patient.lifecycle']),
  covered('patient-note.create', [], ['patient_note.add']),
  covered('patient-note.update', [], ['patient_note.update']),
  excluded('patient-note.delete', 'Permanent note deletion remains unavailable until a validated retention and recovery policy exists.'),

  covered('clinical-record.read', ['app.read']),
  covered('clinical-record.create', [], ['clinical_record.upsert']),
  covered('clinical-record.update', [], ['clinical_record.upsert']),
  covered('clinical-record.read-history', ['app.read']),

  covered('plan.list-search', ['app.read']),
  covered('plan.read', ['app.read']),
  covered('plan.create', [], ['plan.create_simple']),
  covered('plan.update', [], ['plan.update_fields']),
  covered('plan.duplicate', [], ['plan.duplicate']),
  excluded('plan.delete-safe', 'Permanent plan deletion remains unavailable; archive is the supported clinical retention path.'),
  covered('plan.activate', [], ['plan.activate']),
  covered('plan.pause', [], ['plan.pause']),
  covered('plan.complete', [], ['plan.complete']),
  covered('plan.archive-restore', [], ['plan.archive', 'plan.restore']),
  covered('plan.replace-active', [], ['plan.replace_active']),
  covered('plan.add-exercises', [], ['plan.membership']),
  covered('plan.remove-exercises', [], ['plan.membership']),
  covered('plan.reorder-exercises', [], ['plan.membership']),

  covered('exercise.list-search', ['app.read']),
  covered('exercise.read', ['app.read']),
  covered('exercise.create', [], ['exercise.create_simple']),
  covered('exercise.update', [], ['exercise.update_fields']),
  covered('exercise.duplicate', [], ['exercise.duplicate']),
  covered('exercise.archive-restore', [], ['exercise.lifecycle']),
  excluded('exercise.delete-safe', 'Permanent exercise deletion remains unavailable through Atal IA.'),
  covered('exercise.update-media', [], ['exercise.media']),

  covered('session.prepare', ['app.read']),
  covered('session.start-resume', [], ['session.start_or_resume']),
  covered('session.record-exercise-result', [], ['session.update_draft']),
  covered('session.record-symptoms', [], ['session.update_draft']),
  covered('session.complete', [], ['session.complete']),

  covered('report.list', ['app.read']),
  covered('report.read', ['app.read']),
  covered('report.prepare-summary', ['report.prepare_session_summary']),
  covered('report.review', [], ['report.review']),
  covered('activity.read-audit', ['app.read']),

  covered('delivery.preview', ['app.read', 'delivery.open']),
  covered('delivery.configure', [], ['delivery.action']),
  covered('delivery.generate-pdf', [], ['delivery.action']),
  covered('delivery.download-print-share', [], ['delivery.action']),
  excluded('delivery.prepare-whatsapp', 'Automatic external messaging remains outside the approved local agent boundary.'),
  covered('export.patients', [], ['data.export_local']),
  covered('export.progress', [], ['data.export_local']),
  covered('export.plans-backup', [], ['data.export_local']),

  covered('settings.read', ['app.read']),
  covered('settings.update-profile', [], ['settings.profile_update']),
  covered('settings.update-privacy', [], ['settings.update']),
  covered('settings.update-appearance', [], ['settings.appearance']),
  covered('settings.update-ai-preferences', [], ['settings.update']),
  excluded('feedback.prepare-share', 'External feedback sharing is outside the clinical agent parity target.'),

  covered('navigation.open-screen', ['navigation.open']),
  covered('navigation.open-contextual-assistant'),
  covered('assistant.resume-task'),
];
