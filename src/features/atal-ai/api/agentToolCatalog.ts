export type AgentToolCatalogEntry = {
  name: string;
  kind: 'read' | 'action';
  contract: string;
};

export const agentToolCatalog: AgentToolCatalogEntry[] = [
  { name: 'app.read', kind: 'read', contract: 'resource, optional query/status/limit and optional patient/plan/exercise/session references.' },
  { name: 'patient.search', kind: 'read', contract: 'query: non-empty patient search text.' },
  { name: 'patient.summarize', kind: 'read', contract: 'patient reference.' },
  { name: 'session.summarize_recent', kind: 'read', contract: 'patient reference and optional limit 1-10.' },
  { name: 'report.prepare_session_summary', kind: 'read', contract: 'session reference or patient reference.' },
  { name: 'navigation.open', kind: 'read', contract: 'route: safe internal Atal route beginning with /.' },

  { name: 'patient.create', kind: 'action', contract: 'patient object, record object and optional plan object with direct canonical fields.' },
  { name: 'patient.update', kind: 'action', contract: 'patient reference and patch with demographic fields and/or nested contact.' },
  { name: 'patient.lifecycle', kind: 'action', contract: 'patient reference and archived boolean.' },
  { name: 'patient_note.add', kind: 'action', contract: 'patient reference and content.' },
  { name: 'patient_note.update', kind: 'action', contract: 'patient reference, noteId and content.' },
  { name: 'clinical_record.upsert', kind: 'action', contract: 'patient reference and patch with record fields.' },

  { name: 'plan.create_simple', kind: 'action', contract: 'patient reference, title and optional direct plan fields, exerciseIds and draft/active status.' },
  { name: 'plan.update_fields', kind: 'action', contract: 'plan reference and patch with plan text fields.' },
  { name: 'plan.duplicate', kind: 'action', contract: 'plan reference and optional title.' },
  { name: 'plan.membership', kind: 'action', contract: 'plan reference, operation add/remove/reorder and exerciseIds.' },
  { name: 'plan.activate', kind: 'action', contract: 'plan reference.' },
  { name: 'plan.pause', kind: 'action', contract: 'plan reference.' },
  { name: 'plan.complete', kind: 'action', contract: 'plan reference.' },
  { name: 'plan.archive', kind: 'action', contract: 'plan reference.' },
  { name: 'plan.restore', kind: 'action', contract: 'plan reference.' },
  { name: 'plan.replace_active', kind: 'action', contract: 'patient reference, target plan reference and replaceCurrent true.' },

  { name: 'exercise.create_simple', kind: 'action', contract: 'name and optional direct exercise prescription fields.' },
  { name: 'exercise.update_fields', kind: 'action', contract: 'exercise reference and patch with direct exercise fields.' },
  { name: 'exercise.duplicate', kind: 'action', contract: 'exercise reference and optional name.' },
  { name: 'exercise.lifecycle', kind: 'action', contract: 'exercise reference and archived boolean.' },
  { name: 'exercise.media', kind: 'action', contract: 'exercise reference, mediaType image/sequence and artifactIds from the attached local files.' },

  { name: 'session.start_or_resume', kind: 'action', contract: 'patient and plan references, optional startPain, startEnergy and comment.' },
  { name: 'session.update_draft', kind: 'action', contract: 'patient and plan references and patch object with session progress.' },
  { name: 'session.complete', kind: 'action', contract: 'patient and plan references, completed/partial status and final patch.' },
  { name: 'report.review', kind: 'action', contract: 'session reference and observation.' },

  { name: 'settings.update', kind: 'action', contract: 'settings reference and supported settings patch.' },
  { name: 'settings.profile_update', kind: 'action', contract: 'professionalName, specialty and/or clinic.' },
  { name: 'settings.appearance', kind: 'action', contract: 'mode: light, dark or system.' },
  { name: 'delivery.open', kind: 'read', contract: 'plan reference.' },
  { name: 'delivery.action', kind: 'action', contract: 'plan reference, action download/share/print and optional options.' },
  { name: 'data.export_local', kind: 'action', contract: 'exportType: patients, progress, plans or backup.' },
];

export const agentToolCatalogByName = new Map(agentToolCatalog.map((entry) => [entry.name, entry]));
