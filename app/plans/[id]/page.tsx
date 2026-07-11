import { PlanDetailScreen } from '@/src/screens/PlanDetailScreen';

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanDetailScreen planId={id} />;
}
