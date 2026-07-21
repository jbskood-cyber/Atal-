import { normalizePatientPlanDeliveryOptions } from './deliveryOptions';
import { createPatientPlanPdf as createDetailedPatientPlanPdf } from './pdfRenderer';
import { renderPatientSessionLogPdf } from './pdfSessionLogRenderer';
import { renderSimplePatientPlanPdf } from './pdfSimpleRenderer';
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
  if (options.mode === 'simple') return renderSimplePatientPlanPdf(documentModel, options);
  if (options.mode === 'session-log') return renderPatientSessionLogPdf(documentModel, options);
  return createDetailedPatientPlanPdf(documentModel, options.includeImages ? resolvedMedia : []);
}
