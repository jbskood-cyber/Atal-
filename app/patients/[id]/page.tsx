import { PatientProfileScreen } from '@/src/screens/PatientProfileScreen';

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientProfileScreen patientId={id} />;
}
