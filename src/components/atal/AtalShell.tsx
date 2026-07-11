'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpDown,
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

const primary = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/patients', label: 'Pacientes', icon: UsersRound },
  { href: '/plans', label: 'Planes', icon: ClipboardList },
];

const secondary = [
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/activity?view=tracking', label: 'Seguimiento', icon: Activity },
  { href: '/activity?view=reports', label: 'Reportes', icon: FileText },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function AtalShell({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  useEffect(() => {
    ['/', '/patients', '/patients/new', '/patients/p01', '/plans', '/plans/new', '/plans/pl01', '/exercises', '/exercises/new', '/exercises/e01', '/activity', '/activity/p01', '/assistant', '/settings', '/exports'].forEach((href) => router.prefetch(href));
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setNewOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setSearchOpen(false); setNotificationsOpen(false); setNewOpen(false); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const openNew = onNew ?? (() => setNewOpen(true));

  return (
    <div className="atal-app">
      <aside className="atal-sidebar">
        <AtalLogo />
        <nav className="atal-sidebar__nav" aria-label="Navegación principal">
          {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
          <Link href="/activity" className={isActive('/activity') ? 'is-active' : ''}><Activity /><span>Actividad</span></Link>
          <Link href="/exercises" className={isActive('/exercises') ? 'is-active' : ''}><Dumbbell /><span>Ejercicios</span></Link>
          <Link href="/exports" className={isActive('/exports') ? 'is-active' : ''}><FileDown /><span>Exportaciones</span></Link>
          <Link href="/settings" className={isActive('/settings') ? 'is-active' : ''}><Settings /><span>Ajustes</span></Link>
        </nav>
        <div className="atal-sidebar__profile"><AvatarMini /><span><strong>Cuenta demo</strong><small>Fisioterapeuta</small></span></div>
      </aside>

      <div className="atal-workspace">
        <header className="atal-mobile-header">
          <AtalLogo />
          <div>
            <button type="button" aria-label="Notificaciones" onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell /><i /></button>
            <button type="button" aria-label="Crear nuevo" onClick={openNew} className="atal-new-button"><Plus /></button>
          </div>
        </header>

        <header className="atal-desktop-header">
          <div className="atal-desktop-title">Escritorio maestro</div>
          <div className="atal-desktop-actions">
            <button type="button" className="atal-desktop-search" onClick={() => setSearchOpen(true)}><Search /><span>Buscar pacientes, planes, ejercicios...</span><kbd>⌘ K</kbd></button>
            <button type="button" aria-label="Notificaciones" onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell /><i /></button>
            <button type="button" onClick={openNew} className="atal-desktop-new"><Plus /> Nuevo</button>
          </div>
        </header>

        <div className="atal-route-content">{children}</div>
      </div>

      {menuOpen && <button type="button" aria-label="Cerrar menú" className="atal-nav-backdrop" onClick={() => setMenuOpen(false)} />}

      <div className="atal-mobile-dock">
        <div className="atal-nav-slot">
            {!menuOpen ? (
              <nav aria-label="Navegación principal" className="atal-primary-nav">
                {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
                <button type="button" aria-label="Más secciones" className={menuOpen || isActive('/activity') || isActive('/exercises') || isActive('/settings') ? 'is-active' : ''} onClick={() => setMenuOpen(true)}><ArrowUpDown /><span>Más</span></button>
              </nav>
            ) : (
              <div className="atal-more-menu" role="dialog" aria-label="Más secciones">
                {secondary.map(({ href, label, icon: Icon }) => <Link key={label} href={href} prefetch onClick={() => setMenuOpen(false)} className={`atal-secondary-link ${isActive(href) ? 'is-active' : ''}`}><span className="atal-more-icon"><Icon /></span><span>{label}</span><ChevronRight /></Link>)}
              </div>
            )}
        </div>
        <Link href="/assistant" aria-label="Atal IA" className={isActive('/assistant') ? 'atal-ai-button is-active' : 'atal-ai-button'}><Sparkles /><span>Atal IA</span></Link>
      </div>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
      {newOpen && <NewPanel onClose={() => setNewOpen(false)} onNavigate={(href) => { setNewOpen(false); router.push(href); }} />}
    </div>
  );
}

function PanelFrame({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="atal-overlay" onMouseDown={onClose}><section className="atal-native-sheet" onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header>{children}</section></div>;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const entries = [
    { label: 'Paciente Demo 01', detail: 'Paciente · Plan activo', href: '/patients/p01', icon: UsersRound },
    { label: 'Rehabilitación — Fase 1', detail: 'Plan · 4 semanas', href: '/plans/pl01', icon: ClipboardList },
    { label: 'Sentadilla asistida', detail: 'Ejercicio · Rodilla', href: '/exercises', icon: Dumbbell },
  ].filter((entry) => `${entry.label} ${entry.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <PanelFrame title="Buscar en Atal" onClose={onClose}><label className="atal-command-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paciente, plan o ejercicio" /></label><div className="atal-command-results">{entries.map(({ label, detail, href, icon: Icon }) => <Link key={href} href={href}><span><Icon /></span><span><b>{label}</b><small>{detail}</small></span><ChevronRight /></Link>)}{!entries.length && <p>No encontramos resultados.</p>}</div></PanelFrame>;
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return <PanelFrame title="Notificaciones" onClose={onClose}><div className="atal-notification-list"><button type="button"><span className="is-warning"><Activity /></span><span><b>Revisar progreso</b><small>Paciente Demo 02 reportó dolor 6/10.</small></span><i>Ahora</i></button><button type="button"><span><CheckCircle2 /></span><span><b>Sesión completada</b><small>Paciente Demo 01 terminó su rutina.</small></span><i>8:45</i></button></div></PanelFrame>;
}

function NewPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  return <PanelFrame title="Crear nuevo" onClose={onClose}><div className="atal-quick-actions"><button type="button" onClick={() => onNavigate('/patients/new')}><span><UserPlus /></span><span><b>Paciente</b><small>Crear un expediente clínico</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/plans/new')}><span><ClipboardList /></span><span><b>Plan</b><small>Diseñar una nueva rehabilitación</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/exercises')}><span><Dumbbell /></span><span><b>Ejercicio</b><small>Abrir la biblioteca y añadir uno</small></span><ChevronRight /></button></div></PanelFrame>;
}

function AvatarMini() { return <span className="atal-avatar atal-avatar--md">CD</span>; }
