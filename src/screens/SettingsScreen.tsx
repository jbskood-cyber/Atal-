'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, CircleUserRound, LockKeyhole, Moon, Palette, Smartphone, Sparkles } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';

export function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [compact, setCompact] = useState(true);
  const [notice, setNotice] = useState('');
  const select = (label: string) => { setNotice(`${label}: preferencia guardada en esta sesión`); window.setTimeout(() => setNotice(''), 1800); };

  return <AtalShell><main className="atal-content atal-flow-page atal-settings-page">
    <div className="atal-form-heading"><span className="atal-eyebrow">Preferencias</span><h1>Ajustes</h1><p>Personaliza la experiencia clínica de Atal.</p></div>
    <button type="button" className="atal-settings-profile" onClick={() => select('Perfil profesional')}><Avatar name="Cuenta Demo" size="lg" /><span><h2>Cuenta demo</h2><p>Fisioterapeuta · Plan profesional</p></span><ChevronRight /></button>
    <SettingsGroup title="Experiencia"><ToggleRow icon={<Bell />} title="Notificaciones" detail="Alertas de sesiones y pacientes" value={notifications} onChange={setNotifications} /><ToggleRow icon={<Smartphone />} title="Respuesta táctil" detail="Feedback visual al completar acciones" value={haptics} onChange={setHaptics} /><ToggleRow icon={<Palette />} title="Vista compacta" detail="Mayor densidad en dispositivos móviles" value={compact} onChange={setCompact} /></SettingsGroup>
    <SettingsGroup title="Cuenta"><ActionRow icon={<CircleUserRound />} title="Perfil profesional" onClick={() => select('Perfil profesional')} /><ActionRow icon={<Smartphone />} title="Estados del sistema" detail="Vacío, carga, error y éxito" onClick={() => router.push('/system-states')} /><ActionRow icon={<LockKeyhole />} title="Privacidad y seguridad" onClick={() => select('Privacidad')} /><ActionRow icon={<Sparkles />} title="Preferencias de Atal IA" onClick={() => select('Atal IA')} /><ActionRow icon={<Moon />} title="Apariencia" detail="Claro" onClick={() => select('Apariencia')} /></SettingsGroup>
    {notice && <div className="atal-inline-notice">{notice}</div>}
  </main></AtalShell>;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="atal-settings-group"><h2>{title}</h2><div>{children}</div></section>; }
function ToggleRow({ icon, title, detail, value, onChange }: { icon: React.ReactNode; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) { return <button type="button" className="atal-settings-row" onClick={() => onChange(!value)}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span><i className={value ? 'is-on' : ''}><em /></i></button>; }
function ActionRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail?: string; onClick: () => void }) { return <button type="button" className="atal-settings-row" onClick={onClick}><span>{icon}</span><span><b>{title}</b>{detail && <small>{detail}</small>}</span><ChevronRight /></button>; }
