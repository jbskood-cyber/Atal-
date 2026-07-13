import { useEffect, useState } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';

export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused || remaining <= 0) return; const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, [paused, remaining]);
  useEffect(() => { if (remaining === 0) onDone(); }, [remaining, onDone]);
  return <div className="atal-rest-overlay" role="dialog" aria-modal="true" aria-label="Descanso entre series"><section><span>Descanso</span><strong>{remaining}<small>s</small></strong><h2>Respira.</h2><p>Continúa cuando te sientas listo.</p><div><button type="button" onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}{paused ? 'Reanudar' : 'Pausar'}</button><button type="button" onClick={onDone}><SkipForward /> Saltar descanso</button></div><button type="button" className="atal-session-primary" onClick={onDone}>Continuar</button></section></div>;
}
