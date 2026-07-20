'use client';

import { useState } from 'react';
import { ArrowLeft, Bot, Check, EyeOff, Moon, Save, ShieldCheck, Sun, UserRound, WandSparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AtalShell } from '@/src/components/atal/AtalShell';
import { useTheme, type ThemeMode } from '@/src/context/ThemeContext';
import { updateSettings, useAtalStore } from '@/src/data/atalStore';

export type SettingsKind = 'profile' | 'privacy' | 'ai' | 'appearance';
const titles = { profile: 'Perfil profesional', privacy: 'Privacidad y seguridad', ai: 'Preferencias de Atal IA', appearance: 'Apariencia' };

export function SettingsDetailScreen({ kind }: { kind: SettingsKind }) {
  const router = useRouter();
  return (
    <AtalShell>
      <main className="atal-content atal-flow-page atal-settings-detail">
        <div className="atal-flow-topbar">
          <button type="button" onClick={() => router.back()}><ArrowLeft /></button>
          <span>Ajustes</span>
          <i />
        </div>
        {kind === 'profile' && <Profile />}
        {kind === 'privacy' && <Privacy />}
        {kind === 'ai' && <AiPreferences />}
        {kind === 'appearance' && <Appearance />}
      </main>
    </AtalShell>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return <button type="button" className="atal-settings-save" onClick={onClick}>{saved ? <Check /> : <Save />}{saved ? 'Cambios guardados' : 'Guardar cambios'}</button>;
}

function Profile() {
  const settings = useAtalStore((state) => state.settings);
  const [name, setName] = useState(settings.professionalName === 'Cuenta demo' ? '' : settings.professionalName);
  const [specialty, setSpecialty] = useState(settings.specialty);
  const [clinic, setClinic] = useState(settings.clinic);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <DetailHeading icon={<UserRound />} title={titles.profile} text="Datos que identifican tu práctica profesional." />
      <div className="atal-settings-form">
        <label><span>Nombre profesional</span><input value={name} placeholder="Tu nombre" onChange={(event) => { setName(event.target.value); setSaved(false); }} /></label>
        <label><span>Especialidad</span><input value={specialty} placeholder="Fisioterapia" onChange={(event) => { setSpecialty(event.target.value); setSaved(false); }} /></label>
        <label><span>Centro o clínica</span><input value={clinic} placeholder="Opcional" onChange={(event) => { setClinic(event.target.value); setSaved(false); }} /></label>
      </div>
      <SaveButton saved={saved} onClick={() => {
        updateSettings({ professionalName: name.trim() || 'Fisioterapeuta', specialty: specialty.trim() || 'Fisioterapeuta', clinic: clinic.trim() });
        setSaved(true);
      }} />
    </>
  );
}

function Privacy() {
  const settings = useAtalStore((state) => state.settings);
  return (
    <>
      <DetailHeading icon={<ShieldCheck />} title={titles.privacy} text="Controla cómo se muestra la identidad del paciente." />
      <div className="atal-settings-card">
        <LocalToggle
          icon={<EyeOff />}
          title="Ocultar nombre en vista del paciente"
          detail="Muestra “Paciente” al previsualizar o compartir su plan"
          value={settings.clinicalPrivacy}
          onChange={(clinicalPrivacy) => updateSettings({ clinicalPrivacy })}
        />
      </div>
      <div className="atal-role-note is-neutral">
        <ShieldCheck />
        <span><b>Información clínica protegida</b><p>La vista del paciente contiene su plan, ejercicios e indicaciones. El expediente clínico permanece en el panel profesional.</p></span>
      </div>
    </>
  );
}

function AiPreferences() {
  const settings = useAtalStore((state) => state.settings);
  const [instructions, setInstructions] = useState(settings.aiInstructions);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <DetailHeading icon={<WandSparkles />} title={titles.ai} text="Personaliza las respuestas y alertas del asistente." />
      <div className="atal-settings-card">
        <LocalToggle icon={<Bot />} title="Sugerencias clínicas" detail="Incluye propuestas útiles al preparar planes" value={settings.aiSuggestions} onChange={(aiSuggestions) => updateSettings({ aiSuggestions })} />
        <LocalToggle icon={<WandSparkles />} title="Alertas inteligentes" detail="Destaca información que requiere revisión" value={settings.aiAlerts} onChange={(aiAlerts) => updateSettings({ aiAlerts })} />
      </div>
      <label className="atal-settings-textarea">
        <span>Indicaciones para las respuestas</span>
        <textarea value={instructions} placeholder="Ej. Responde de forma breve y prioriza seguridad clínica." onChange={(event) => { setInstructions(event.target.value); setSaved(false); }} />
      </label>
      <SaveButton saved={saved} onClick={() => { updateSettings({ aiInstructions: instructions.trim() }); setSaved(true); }} />
    </>
  );
}

function Appearance() {
  const { mode, setMode } = useTheme();
  return (
    <>
      <DetailHeading icon={<Moon />} title={titles.appearance} text="Elige la apariencia de Atal." />
      <div className="atal-theme-options">
        <ThemeOption mode="light" current={mode} title="Claro" detail="Blanco y verde Atal" icon={<Sun />} onClick={setMode} />
        <ThemeOption mode="dark" current={mode} title="Oscuro" detail="Negro y superficies neutras" icon={<Moon />} onClick={setMode} />
        <ThemeOption mode="system" current={mode} title="Sistema" detail="Usa la preferencia del dispositivo" icon={<WandSparkles />} onClick={setMode} />
      </div>
    </>
  );
}

function DetailHeading({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="atal-detail-heading"><span>{icon}</span><h1>{title}</h1><p>{text}</p></div>;
}

function ThemeOption({ mode, current, title, detail, icon, onClick }: { mode: ThemeMode; current: ThemeMode; title: string; detail: string; icon: React.ReactNode; onClick: (mode: ThemeMode) => void }) {
  return <button type="button" className={mode === current ? 'is-active' : ''} aria-pressed={mode === current} onClick={() => onClick(mode)}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span>{mode === current && <Check />}</button>;
}

function LocalToggle({ icon, title, detail, value, onChange }: { icon: React.ReactNode; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className="atal-settings-row" aria-pressed={value} onClick={() => onChange(!value)}><span>{icon}</span><span><b>{title}</b><small>{detail}</small></span><i className={value ? 'is-on' : ''}><em /></i></button>;
}
