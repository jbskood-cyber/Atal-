'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpDown,
  Bell,
  ClipboardList,
  Dumbbell,
  FileDown,
  FileText,
  Home,
  Plus,
  Search,
  Settings,
  Sparkles,
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
  { href: '/tracking', label: 'Seguimiento', icon: Activity },
  { href: '/reports', label: 'Reportes', icon: FileText },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function AtalShell({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const futureSection = (label: string) => {
    setMenuOpen(false);
    setNotice(`${label} se construirá en el siguiente bloque`);
    window.setTimeout(() => setNotice(''), 2400);
  };

  return (
    <div className="atal-app">
      <aside className="atal-sidebar">
        <AtalLogo />
        <nav className="atal-sidebar__nav" aria-label="Navegación principal">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={isActive(href) ? 'is-active' : ''}>
              <Icon size={22} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          ))}
          <Link href="/reports" className={isActive('/reports') ? 'is-active' : ''}><FileText size={22} strokeWidth={1.7} /><span>Reportes</span></Link>
          <Link href="/tracking" className={isActive('/tracking') ? 'is-active' : ''}><ArrowUpDown size={22} strokeWidth={1.7} /><span>Seguimiento</span></Link>
          <button type="button" onClick={() => futureSection('Exportaciones')}><FileDown size={22} strokeWidth={1.7} /><span>Exportaciones</span></button>
          <button type="button" onClick={() => futureSection('Ajustes')}><Settings size={22} strokeWidth={1.7} /><span>Ajustes</span></button>
        </nav>
        <div className="atal-sidebar__profile"><AvatarMini /><span><strong>Cuenta demo</strong><small>Fisioterapeuta</small></span></div>
      </aside>

      <div className="atal-workspace">
        <header className="atal-mobile-header">
          <AtalLogo />
          <div>
            <button type="button" aria-label="Notificaciones" onClick={() => futureSection('Notificaciones')} className="atal-icon-button atal-notification"><Bell size={25} strokeWidth={1.65} /><i /></button>
            <button type="button" aria-label="Crear nuevo" onClick={onNew ?? (() => futureSection('Nuevo registro'))} className="atal-new-button"><Plus size={28} strokeWidth={1.8} /></button>
          </div>
        </header>

        <header className="atal-desktop-header">
          <div className="atal-desktop-title">Escritorio maestro</div>
          <div className="atal-desktop-actions">
            <Search size={20} />
            <span>Buscar pacientes, planes, reportes...</span>
            <kbd>⌘ K</kbd>
            <button type="button" aria-label="Notificaciones" onClick={() => futureSection('Notificaciones')} className="atal-icon-button atal-notification"><Bell size={24} /><i /></button>
            <button type="button" onClick={onNew ?? (() => futureSection('Nuevo registro'))} className="atal-desktop-new"><Plus size={19} /> Nuevo</button>
          </div>
        </header>

        {children}
      </div>

      <div className="atal-mobile-dock">
        <nav aria-label="Navegación principal">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-label={label} className={isActive(href) ? 'is-active' : ''}><Icon size={27} strokeWidth={1.7} /></Link>
          ))}
          <button type="button" aria-label="Más secciones" className={menuOpen || pathname.startsWith('/exercises') || pathname.startsWith('/tracking') || pathname.startsWith('/reports') ? 'is-active' : ''} onClick={() => setMenuOpen((open) => !open)}><ArrowUpDown size={29} strokeWidth={1.6} /></button>
        </nav>
        <button type="button" aria-label="Atal IA" onClick={() => futureSection('Atal IA')} className="atal-ai-button"><Sparkles size={27} strokeWidth={1.7} /></button>
      </div>

      {menuOpen && (
        <div className="atal-more-menu" role="dialog" aria-label="Más secciones">
          <button className="atal-more-menu__close" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar"><X size={20} /></button>
          {secondary.map(({ href, label, icon: Icon }, index) =>
            index < 3 ? (
              <Link key={label} href={href} onClick={() => setMenuOpen(false)} className={isActive(href) ? 'is-active' : ''}><Icon size={25} strokeWidth={1.7} /><span>{label}</span></Link>
            ) : (
              <button key={label} type="button" onClick={() => futureSection(label)}><Icon size={25} strokeWidth={1.7} /><span>{label}</span></button>
            ),
          )}
        </div>
      )}

      {notice && <div className="atal-toast" role="status">{notice}</div>}
    </div>
  );
}

function AvatarMini() {
  return <span className="atal-avatar atal-avatar--md">CD</span>;
}
