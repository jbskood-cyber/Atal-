import { normalizePatientPlanDeliveryOptions } from './deliveryOptions';
import { createPatientPlanPdf as createDetailedPatientPlanPdf } from './pdfRenderer';
import { renderUniversalPatientPlanPdf } from './pdfUniversalRenderer';
import type {
  PatientPlanDeliveryOptions,
  PatientPlanDocument,
  PatientPlanPdfResult,
  PatientPlanResolvedMedia,
} from './types';

export async function createPatientPlanPdf(
  documentModel: PatientPlanDocument,
  resolvedMedia: PatientPlanResolvedMedia[],
  input: Partial<PatientPlanDeliveryOptions> | undefined,
): Promise<PatientPlanPdfResult> {
  const options = normalizePatientPlanDeliveryOptions(input);
  if (options.mode !== 'detailed') return renderUniversalPatientPlanPdf(documentModel, options);
  return createDetailedPatientPlanPdf(documentModel, options.includeImages ? resolvedMedia : []);
}
