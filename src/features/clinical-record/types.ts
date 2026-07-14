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
