export type ClinicalRecord = {
  id: string;
  patientId: string;
  version: number;
  date: string;
  reasonForVisit: string;
  evolution: string;
  affectedArea: string;
  symptoms: string[];
  painLevel: number | null;
  providedDiagnosis: string;
  functionalLimitations: string[];
  goals: string[];
  relevantHistory: string[];
  precautions: string[];
  clinicalNotes: string;
  planId: string;
  professional: string;
  createdAt: string;
  updatedAt: string;
};

export type NewClinicalRecord = Omit<ClinicalRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'>;

export type PainLevelParseResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

const PAIN_LEVEL_ERROR = 'El dolor debe ser un número entre 0 y 10.';

export function parsePainLevelInput(input: string): PainLevelParseResult {
  const normalized = input.trim().replace(',', '.');
  if (!normalized) return { ok: true, value: null };
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return { ok: false, message: PAIN_LEVEL_ERROR };

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 10) return { ok: false, message: PAIN_LEVEL_ERROR };
  return { ok: true, value };
}

export function formatPainLevel(value: number | null): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? String(value) : '';
}
