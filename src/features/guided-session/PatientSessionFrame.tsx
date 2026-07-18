import { LogOut } from 'lucide-react';
import { AtalLogo } from '@/src/components/atal/AtalLogo';

export function PatientSessionFrame({ children, progress, label, planName, onExit }: { children: React.ReactNode; progress: number; label: string; planName?: string; onExit: () => void }) {
  return <main className="atal-patient-session"><header className="atal-session-header"><AtalLogo /><div className="atal-session-progress">{planName && <small>{planName}</small>}<span><b>{label}</b><strong>{Math.round(progress)}%</strong></span><i><em style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></i></div><button type="button" onClick={onExit}><LogOut /><span>Salir</span></button></header><div className="atal-session-stage">{children}</div></main>;
}
