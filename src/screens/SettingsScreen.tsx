'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, CircleUserRound, HelpCircle, LockKeyhole, Moon, Palette, Smartphone, Sparkles } from 'lucide-react';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { Avatar } from '@/src/components/atal/Avatar';
import { updateSettings, useAtalStore } from '@/src/data/atalStore';

export function SettingsScreen() {
  const router = useRouter();
  const settings = useAtalStore((state) => state.settings);
  const professionalName = settings.professionalName === 'Cuenta demo' ? 'Perfil profesional' : settings.professionalName;

  useEffect(() => {
    document.documentElement.classList.toggle('atal-compact', settings.compact);
  }, [settings.compact]);

  return (
    <AtalShell>
      <main className="atal-content atal-flow-page atal-settings-page">
        <div className="atal-form-heading">
          <span className="atal-eyebrow">Preferencias</span>
          <h1>Ajustes</h1>
          <p>Configura Atal para tu forma de trabajar.</p>
        </div>

        <button type="button" className="atal-settings-profile" onClick={() => router.push('/settings/profile')}>
          <Avatar name={professionalName} size="lg" />
          <span><h2>{professionalName}</h2><p>{settings.specialty}{settings.clinic ? ` · ${settings.clinic}` : ''}</p></span>
          <ChevronRight />
        </button>

        <SettingsGroup title="Experiencia">
          <ToggleRow icon={<Bell />} title="Notificaciones" detail="Alertas de sesiones y pacientes" value={settings.notifications} onChange={(notifications) => updateSettings({ notifications })} />
          <ToggleRow icon={<Smartphone />} title="Vibración al guardar" detail="Confirma acciones compatibles en tu dispositivo" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
          <ToggleRow icon={<Palette />} title="Vista compacta" detail="Reduce espacios para mostrar más información" value={settings.compact} onChange={(compact) => updateSettings({ compact })} />
        </SettingsGroup>

        <SettingsGroup title="Cuenta y seguridad">
          <ActionRow icon={<CircleUserRound />} title="Perfil profesional" detail="Nombre, especialidad y clínica" onClick={() => router.push('/settings/profile')} />
          <ActionRow icon={<LockKeyhole />} title="Privacidad y seguridad" detail="Protege la información del paciente" onClick={() => router.push('/settings/privacy')} />
          <ActionRow icon={<Sparkles />} title="Preferencias de Atal IA" detail="Personaliza el apoyo del asistente" onClick={() => router.push('/settings/ai')} />
          <ActionRow icon={<Moon />} title="Apariencia" detail="Claro · Oscuro · Sistema" onClick={() => router.push('/settings/appearance')} />
          <ActionRow icon={<HelpCircle />} title="Ayuda y comentarios" detail="Comparte una duda, error o sugerencia" onClick={() => router.push('/settings/feedback')} />
        </SettingsGroup>
      </main>
    </AtalShell>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="atal-settings-group"><h2>{title}</h2><div>{children}</div></section>;
}

function ToggleRow({ icon, title, detail, value, onChange }: { icon: React.ReactNode; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className="atal-settings-row" aria-pressed={value} onClick={() => onChange(!value)}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span><i className={value ? 'is-on' : ''}><em /></i></button>;
}

function ActionRow({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail?: string; onClick: () => void }) {
  return <button type="button" className="atal-settings-row" onClick={onClick}><span>{icon}</span><span><b>{title}</b>{detail && <small>{detail}</small>}</span><ChevronRight /></button>;
}
