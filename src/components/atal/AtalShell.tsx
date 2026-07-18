'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileDown,
  FileText,
  Home,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { AtalLogo } from './AtalLogo';
import { markAllNotificationsRead,markNotificationRead,useAtalStore } from '@/src/data/atalStore';

const primary = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/patients', label: 'Pacientes', icon: UsersRound },
  { href: '/plans', label: 'Planes', icon: ClipboardList },
  { href: '/activity', label: 'Actividad', icon: Activity },
  { href: '/assistant', label: 'Atal IA', icon: Sparkles },
];

const secondary = [
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/activity?view=tracking', label: 'Seguimiento', icon: Activity },
  { href: '/activity?view=reports', label: 'Reportes', icon: FileText },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

const PersistentShellContext = createContext(false);

export function AtalShell({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const isPersistent = useContext(PersistentShellContext);
  return isPersistent ? <>{children}</> : <AtalShellFrame onNew={onNew}>{children}</AtalShellFrame>;
}

export function AtalPersistentShell({ children }: { children: ReactNode }) {
  return <PersistentShellContext.Provider value><AtalShellFrame>{children}</AtalShellFrame></PersistentShellContext.Provider>;
}

function AtalShellFrame({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const settings=useAtalStore((state)=>state.settings);const unread=useAtalStore((state)=>state.notifications.filter((item)=>!item.read).length);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  useEffect(() => {
    ['/', '/patients', '/patients/new', '/patients/p01', '/plans', '/plans/new', '/plans/pl01', '/exercises', '/exercises/new', '/exercises/e01', '/activity', '/activity/p01', '/assistant', '/settings', '/exports'].forEach((href) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    setSecondaryOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setNewOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSecondaryOpen(false); setSearchOpen(false); setNotificationsOpen(false); setNewOpen(false); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const openNew = onNew ?? (() => setNewOpen(true));

  return (
    <div className={`atal-app${settings.compact?' atal-app--compact':''}`}>
      <aside className="atal-sidebar">
        <AtalLogo />
        <nav className="atal-sidebar__nav" aria-label="Navegación principal">
          {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
          <Link href="/exercises" className={isActive('/exercises') ? 'is-active' : ''}><Dumbbell /><span>Ejercicios</span></Link>
          <Link href="/exports" className={isActive('/exports') ? 'is-active' : ''}><FileDown /><span>Exportaciones</span></Link>
          <Link href="/settings" className={isActive('/settings') ? 'is-active' : ''}><Settings /><span>Ajustes</span></Link>
        </nav>
        <div className="atal-sidebar__profile"><AvatarMini /><span><strong>{settings.professionalName}</strong><small>{settings.specialty}</small></span></div>
      </aside>

      <div className="atal-workspace">
        <header className="atal-mobile-header">
          <AtalLogo />
          <div>
            <button type="button" aria-label="Abrir funciones secundarias" onClick={() => setSecondaryOpen(true)} className="atal-header-avatar"><AvatarMini /></button>
            <button type="button" aria-label="Buscar en Atal" onClick={() => setSearchOpen(true)} className="atal-icon-button"><Search /></button>
            <button type="button" aria-label={`${unread} notificaciones sin leer`} onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell />{unread>0&&<i />}</button>
            <button type="button" aria-label="Crear nuevo" onClick={openNew} className="atal-new-button"><Plus /></button>
          </div>
        </header>

        <header className="atal-desktop-header">
          <div className="atal-desktop-title">Escritorio maestro</div>
          <div className="atal-desktop-actions">
            <button type="button" className="atal-desktop-search" onClick={() => setSearchOpen(true)}><Search /><span>Buscar pacientes, planes, ejercicios...</span><kbd>⌘ K</kbd></button>
            <button type="button" aria-label={`${unread} notificaciones sin leer`} onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell />{unread>0&&<i />}</button>
            <button type="button" onClick={openNew} className="atal-desktop-new"><Plus /> Nuevo</button>
          </div>
        </header>

        <div className="atal-route-content">{children}</div>
      </div>

      <div className="atal-mobile-dock native-root-dock">
        <nav aria-label="Navegación principal" className="atal-primary-nav">
          {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
        </nav>
      </div>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} onNavigate={(href) => { setNotificationsOpen(false); router.push(href); }} />}
      {newOpen && <NewPanel onClose={() => setNewOpen(false)} onNavigate={(href) => { setNewOpen(false); router.push(href); }} />}
      {secondaryOpen && <SecondaryPanel onClose={() => setSecondaryOpen(false)} onNavigate={(href) => { setSecondaryOpen(false); router.push(href); }} />}
    </div>
  );
}

function PanelFrame({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="atal-overlay" onMouseDown={onClose}><section className="atal-native-sheet" onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header>{children}</section></div>;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const state=useAtalStore((store)=>store);const entries=[...state.patients.map((item)=>({label:item.name,detail:`Paciente · ${item.diagnosis}`,href:`/patients/${item.id}`,icon:UsersRound})),...state.plans.map((item)=>({label:item.title,detail:`Plan · ${state.patients.find((patient)=>patient.id===item.patientId)?.name??''}`,href:`/plans/${item.id}`,icon:ClipboardList})),...state.exercises.map((item)=>({label:item.name,detail:`Ejercicio · ${item.region} · ${item.category}`,href:`/exercises/${item.id}`,icon:Dumbbell})),...state.sessions.map((item)=>({label:`Reporte · ${state.patients.find((patient)=>patient.id===item.patientId)?.name??'Paciente'}`,detail:`Dolor ${item.endPain}/10 · ${item.status}`,href:`/activity/${item.id}`,icon:FileText}))].filter((entry)=>`${entry.label} ${entry.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0,20);
  return <PanelFrame title="Buscar en Atal" onClose={onClose}><label className="atal-command-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paciente, plan o ejercicio" /></label><div className="atal-command-results">{entries.map(({ label, detail, href, icon: Icon }) => <Link key={href} href={href}><span><Icon /></span><span><b>{label}</b><small>{detail}</small></span><ChevronRight /></Link>)}{!entries.length && <p>No encontramos resultados.</p>}</div></PanelFrame>;
}

function NotificationsPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const notifications=useAtalStore((state)=>state.notifications);const open=(id:string,href:string)=>{markNotificationRead(id);onNavigate(href)};
  return <PanelFrame title="Notificaciones" onClose={onClose}><div className="atal-notification-toolbar"><span>{notifications.filter((item)=>!item.read).length} sin leer</span><button type="button" disabled={!notifications.some((item)=>!item.read)} onClick={markAllNotificationsRead}>Marcar todas como leídas</button></div><div className="atal-notification-list">{notifications.map((item)=><button type="button" key={item.id} className={item.read?'is-read':''} onClick={()=>open(item.id,item.href)}><span className={item.severity==='urgent'||item.severity==='attention'?'is-warning':''}>{item.severity==='stable'?<CheckCircle2/>:<Activity/>}</span><span><b>{item.title}</b><small>{item.detail}</small></span><i>{new Date(item.createdAt).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</i></button>)}{!notifications.length&&<p className="atal-empty">No hay notificaciones todavía.</p>}</div></PanelFrame>;
}

function NewPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  return <PanelFrame title="Crear nuevo" onClose={onClose}><div className="atal-quick-actions"><button type="button" onClick={() => onNavigate('/patients/new')}><span><UserPlus /></span><span><b>Paciente</b><small>Crear un expediente clínico</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/plans/new')}><span><ClipboardList /></span><span><b>Plan</b><small>Diseñar una nueva rehabilitación</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/exercises/new')}><span><Dumbbell /></span><span><b>Ejercicio</b><small>Crear un ejercicio personalizado</small></span><ChevronRight /></button></div></PanelFrame>;
}

function SecondaryPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  return <PanelFrame title="Funciones de Atal" onClose={onClose}><div className="atal-quick-actions">{[
    ...secondary,
    { href: '/exports', label: 'Exportaciones', icon: FileDown },
  ].map(({ href, label, icon: Icon }) => <button type="button" key={href} onClick={() => onNavigate(href)}><span><Icon /></span><span><b>{label}</b><small>Abrir {label.toLowerCase()}</small></span><ChevronRight /></button>)}</div></PanelFrame>;
}

function AvatarMini() { return <span className="atal-avatar atal-avatar--md">CD</span>; }
