import { ReportDetailScreen } from '@/src/screens/ReportDetailScreen';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ReportDetailScreen reportId={id} />; }
