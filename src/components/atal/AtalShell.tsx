'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Ellipsis,
  Eye,
  FileDown,
  FileText,
  Home,
  Plus,
  Search,
  Settings,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { AtalLogo, AtalMark } from './AtalLogo';
import { ClinicalQuickPeek, type ClinicalPeekTarget } from './ClinicalQuickPeek';
import { keepDialogTabFocus } from './dialogKeyboard';
import { markAllNotificationsRead,markNotificationRead,useAtalStore } from '@/src/data/atalStore';
import { ContextualAIProvider, useContextualAI } from '@/src/features/atal-ai/contextual/ContextualAIProvider';
import { ContextualAIWorkspace } from '@/src/features/atal-ai/contextual/ContextualAIWorkspace';

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

const PersistentShellContext = createContext(false);

function routePresentation(pathname: string): { section: string; title: string; parent?: string; parentHref?: string } {
  if (pathname === '/') return { section: 'Espacio clínico', title: 'Escritorio maestro' };
  const routes = [
    { prefix: '/patients', section: 'Pacientes', title: 'Pacientes', parent: 'Pacientes', parentHref: '/patients' },
    { prefix: '/plans', section: 'Planes', title: 'Planes', parent: 'Planes', parentHref: '/plans' },
    { prefix: '/exercises', section: 'Biblioteca', title: 'Ejercicios', parent: 'Ejercicios', parentHref: '/exercises' },
    { prefix: '/activity', section: 'Seguimiento', title: 'Actividad', parent: 'Actividad', parentHref: '/activity' },
    { prefix: '/exports', section: 'Herramientas', title: 'Exportaciones' },
    { prefix: '/settings', section: 'Preferencias', title: 'Ajustes' },
    { prefix: '/assistant', section: 'Inteligencia', title: 'Atal IA' },
  ];
  const current = routes.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (!current) return { section: 'Espacio clínico', title: 'Atal' };
  if (pathname === current.prefix) return { section: current.section, title: current.title };
  const nestedTitle = pathname.endsWith('/new')
    ? current.prefix === '/patients' ? 'Nuevo paciente' : current.prefix === '/plans' ? 'Nuevo plan' : 'Nuevo ejercicio'
    : current.prefix === '/patients' ? 'Expediente' : current.prefix === '/plans' ? 'Detalle del plan' : 'Detalle';
  return { section: current.section, title: nestedTitle, parent: current.parent, parentHref: current.parentHref };
}

export function AtalShell({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const isPersistent = useContext(PersistentShellContext);
  return isPersistent ? <>{children}</> : <ContextualAIProvider><AtalShellFrame onNew={onNew}>{children}</AtalShellFrame></ContextualAIProvider>;
}

export function AtalPersistentShell({ children }: { children: ReactNode }) {
  return <PersistentShellContext.Provider value><ContextualAIProvider><AtalShellFrame>{children}</AtalShellFrame></ContextualAIProvider></PersistentShellContext.Provider>;
}

function AtalShellFrame({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const contextualAI = useContextualAI();
  const workspaceOpen = contextualAI.session.mode === 'open';
  const setLauncherSuppressed = contextualAI.setLauncherSuppressed;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchOpenerRef = useRef<HTMLElement | null>(null);
  const [isMac, setIsMac] = useState(false);
  const [isEditingField, setIsEditingField] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const shellOverlayOpen = menuOpen || searchOpen || notificationsOpen || newOpen;
  const settings=useAtalStore((state)=>state.settings);const unread=useAtalStore((state)=>state.notifications.filter((item)=>!item.read).length);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  // Mobile keyboard: floating dock must not cover inputs or clinical notes.
  // It reappears as soon as the user leaves an editable control.
  useEffect(() => {
    let pendingFrame = 0;
    const syncFocusedControl = () => {
      const active = document.activeElement;
      setIsEditingField(active instanceof HTMLElement
        && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)));
    };
    const syncOnBlur = () => {
      pendingFrame = window.requestAnimationFrame(syncFocusedControl);
    };
    document.addEventListener('focusin', syncFocusedControl);
    document.addEventListener('focusout', syncOnBlur);
    syncFocusedControl();
    return () => {
      document.removeEventListener('focusin', syncFocusedControl);
      document.removeEventListener('focusout', syncOnBlur);
      window.cancelAnimationFrame(pendingFrame);
    };
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if (workspaceOpen || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      setMenuOpen(false);
      setNotificationsOpen(false);
      setNewOpen(false);
      searchOpenerRef.current = event.target instanceof HTMLElement ? event.target : null;
      setSearchOpen(true);
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, [workspaceOpen]);

  useEffect(() => {
    setLauncherSuppressed(shellOverlayOpen);
  }, [shellOverlayOpen, setLauncherSuppressed]);

  useEffect(() => () => setLauncherSuppressed(false), [setLauncherSuppressed]);

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
    if (!workspaceOpen) return;
    setMenuOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setNewOpen(false);
  }, [workspaceOpen]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (workspaceOpen) contextualAI.minimize();
        else { setMenuOpen(false); setSearchOpen(false); setNotificationsOpen(false); setNewOpen(false); }
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [workspaceOpen, contextualAI]);

  const openNew = onNew ?? (() => setNewOpen(true));
  const route = routePresentation(pathname);

  return <>
    <div
      className={`atal-app${settings.compact?' atal-app--compact':''}${workspaceOpen?' is-contextual-ai-background':''}`}
      data-contextual-ai-background
      inert={workspaceOpen ? true : undefined}
      aria-hidden={workspaceOpen || undefined}
    >
      <aside className="atal-sidebar">
        <AtalLogo />
        <nav className="atal-sidebar__nav" aria-label="Navegación principal">
          <p className="atal-sidebar__section-label">Espacio clínico</p>
          {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
          <p className="atal-sidebar__section-label">Trabajo</p>
          <Link href="/activity" aria-current={isActive('/activity') ? 'page' : undefined} className={isActive('/activity') ? 'is-active' : ''}><Activity /><span>Actividad</span></Link>
          <Link href="/exercises" aria-current={isActive('/exercises') ? 'page' : undefined} className={isActive('/exercises') ? 'is-active' : ''}><Dumbbell /><span>Ejercicios</span></Link>
          <Link href="/exports" aria-current={isActive('/exports') ? 'page' : undefined} className={isActive('/exports') ? 'is-active' : ''}><FileDown /><span>Exportaciones</span></Link>
          <p className="atal-sidebar__section-label">Asistente</p>
          <Link href="/assistant" aria-current={isActive('/assistant') ? 'page' : undefined} className={isActive('/assistant') ? 'is-active' : ''}><AtalMark /><span>Atal IA</span></Link>
          <p className="atal-sidebar__section-label">Preferencias</p>
          <Link href="/settings" aria-current={isActive('/settings') ? 'page' : undefined} className={isActive('/settings') ? 'is-active' : ''}><Settings /><span>Ajustes</span></Link>
        </nav>
        <div className="atal-sidebar__profile"><AvatarMini /><span><strong>{settings.professionalName}</strong><small>{settings.specialty}</small></span></div>
      </aside>

      <div className="atal-workspace">
        <header className="atal-mobile-header">
          <AtalLogo />
          <div>
            <button type="button" aria-label="Buscar en Atal" onClick={(event) => { searchOpenerRef.current = event.currentTarget; setSearchOpen(true); }} className="atal-icon-button"><Search /></button>
            <button type="button" aria-label={`${unread} notificaciones sin leer`} onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell />{unread>0&&<i />}</button>
            <button type="button" aria-label="Crear nuevo" onClick={openNew} className="atal-new-button"><Plus /></button>
          </div>
        </header>

        <header className="atal-desktop-header">
          <div className="atal-desktop-context" aria-label="Ubicación actual">
            <div className="atal-desktop-overline">
              {route.parent && route.parentHref ? <><Link href={route.parentHref}>{route.parent}</Link><ChevronRight aria-hidden="true" /></> : route.section}
            </div>
            <div className="atal-desktop-title">{route.title}</div>
          </div>
          <div className="atal-desktop-actions">
            <button type="button" className="atal-desktop-search" onClick={(event) => { searchOpenerRef.current = event.currentTarget; setSearchOpen(true); }}><Search /><span>Buscar pacientes, planes, ejercicios...</span><kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd></button>
            <button type="button" aria-label={`${unread} notificaciones sin leer`} onClick={() => setNotificationsOpen(true)} className="atal-icon-button atal-notification"><Bell />{unread>0&&<i />}</button>
            <button type="button" onClick={openNew} className="atal-desktop-new"><Plus /> Nuevo</button>
          </div>
        </header>

        <div className="atal-route-content">{children}</div>
      </div>

      {menuOpen && <>
        <button type="button" aria-label="Cerrar menú" className="atal-nav-backdrop" onClick={() => setMenuOpen(false)} />
        <section className="atal-more-sheet" role="dialog" aria-modal="true" aria-label="Más secciones">
          <span className="atal-more-sheet__handle" aria-hidden="true" />
          <nav className="atal-more-menu" aria-label="Más secciones">
            {secondary.map(({ href, label, icon: Icon }) => <Link key={label} href={href} prefetch onClick={() => setMenuOpen(false)} className={`atal-secondary-link ${isActive(href) ? 'is-active' : ''}`}><span className="atal-more-icon"><Icon /></span><span>{label}</span></Link>)}
          </nav>
        </section>
      </>}

      {!workspaceOpen && <div className={`atal-mobile-dock${shellOverlayOpen?' is-hidden':''}${isEditingField?' is-editing':''}`}>
        <div className="atal-nav-slot">
          <nav aria-label="Navegación principal" className="atal-primary-nav">
            {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={isActive(href) ? 'is-active' : ''}><Icon /><span>{label}</span></Link>)}
            <button type="button" aria-label="Más secciones" className={isActive('/activity') || isActive('/exercises') || isActive('/settings') ? 'is-active' : ''} onClick={() => setMenuOpen(true)}><Ellipsis /><span>Más</span></button>
          </nav>
        </div>
        <Link href="/assistant" aria-label="Atal IA" className={isActive('/assistant') ? 'atal-ai-button is-active' : 'atal-ai-button'}><AtalMark /><span className="sr-only">Atal IA</span></Link>
      </div>}

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} restoreFocusTo={searchOpenerRef.current} />}
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} onNavigate={(href) => { setNotificationsOpen(false); router.push(href); }} />}
      {newOpen && <NewPanel onClose={() => setNewOpen(false)} onNavigate={(href) => { setNewOpen(false); router.push(href); }} />}
    </div>
    <ContextualAIWorkspace />
  </>;
}

function PanelFrame({ title, children, onClose, restoreFocusTo }: { title: string; children: ReactNode; onClose: () => void; restoreFocusTo?: HTMLElement | null }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const returnTo = restoreFocusTo ?? document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLElement>('input[autofocus], button:not([disabled])')?.focus();
    }
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = oldOverflow;
      if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus();
    };
  }, []);
  return <div className="atal-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section ref={dialogRef} className="atal-native-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (dialogRef.current) keepDialogTabFocus(event, dialogRef.current);
      }}>
      <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header>
      {children}
    </section>
  </div>;
}

const searchCategories = ['Todos', 'Pacientes', 'Planes', 'Ejercicios', 'Reportes'] as const;
type SearchCategory = typeof searchCategories[number];

function SearchPanel({ onClose, restoreFocusTo }: { onClose: () => void; restoreFocusTo?: HTMLElement | null }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('Todos');
  const [activeIndex, setActiveIndex] = useState(0);
  const [peek, setPeek] = useState<(ClinicalPeekTarget & { href: string }) | null>(null);
  const peekTrigger = useRef<HTMLButtonElement | null>(null);
  const closePeek = () => {
    setPeek(null);
    window.requestAnimationFrame(() => peekTrigger.current?.focus());
  };
  const state = useAtalStore((store) => store);
  const term = query.trim().toLocaleLowerCase('es-MX');

  // One command surface for quickly jumping to a clinic workspace or finding
  // a clinical entity. Commands only navigate; they never edit patient data.
  const jumpTo = [
    { label: 'Inicio', detail: 'Ir al escritorio', href: '/', icon: Home, kind: 'Secciones' },
    { label: 'Pacientes', detail: 'Abrir directorio de pacientes', href: '/patients', icon: UsersRound, kind: 'Secciones' },
    { label: 'Planes', detail: 'Abrir planes clínicos', href: '/plans', icon: ClipboardList, kind: 'Secciones' },
    { label: 'Actividad', detail: 'Ver seguimiento y reportes', href: '/activity?view=tracking', icon: Activity, kind: 'Secciones' },
    { label: 'Ejercicios', detail: 'Abrir biblioteca de ejercicios', href: '/exercises', icon: Dumbbell, kind: 'Secciones' },
    { label: 'Atal IA', detail: 'Abrir el asistente clínico', href: '/assistant', icon: AtalMark, kind: 'Secciones' },
  ];
  const clinicalEntries = [
    ...state.patients.map((item) => ({ label: item.name, detail: `Paciente · ${item.diagnosis}`, href: `/patients/${item.id}`, icon: UsersRound, kind: 'Pacientes' as const })),
    ...state.plans.map((item) => ({ label: item.title, detail: `Plan · ${state.patients.find((patient) => patient.id === item.patientId)?.name ?? ''}`, href: `/plans/${item.id}`, icon: ClipboardList, kind: 'Planes' as const })),
    ...state.exercises.map((item) => ({ label: item.name, detail: `Ejercicio · ${item.region} · ${item.category}`, href: `/exercises/${item.id}`, icon: Dumbbell, kind: 'Ejercicios' as const })),
    ...state.sessions.map((item) => ({ label: `Reporte · ${state.patients.find((patient) => patient.id === item.patientId)?.name ?? 'Paciente'}`, detail: `Dolor ${item.endPain}/10 · ${item.status}`, href: `/activity/${item.id}`, icon: FileText, kind: 'Reportes' as const })),
  ];
  const entries = !term
    ? (category === 'Todos' ? jumpTo : [])
    : [
      ...(category === 'Todos' ? jumpTo : []),
      ...clinicalEntries.filter((entry) => category === 'Todos' || entry.kind === category),
    ].filter((entry) => `${entry.label} ${entry.detail}`.toLocaleLowerCase('es-MX').includes(term)).slice(0, 20);

  const selected = Math.min(activeIndex, Math.max(entries.length - 1, 0));
  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return <PanelFrame title="Buscar en Atal" onClose={onClose} restoreFocusTo={restoreFocusTo}>
    {peek ? <ClinicalQuickPeek inline target={peek} onClose={closePeek}
      onOpenDetail={() => navigate(peek.href)} /> : <>
    <label className="atal-command-search">
      <Search aria-hidden="true" />
      <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && entries.length) { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, entries.length - 1)); }
          if (event.key === 'ArrowUp' && entries.length) { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && entries[selected]) { event.preventDefault(); navigate(entries[selected].href); }
        }}
        placeholder="Buscar o ir a una sección…" aria-label="Buscar pacientes, planes, ejercicios y reportes" />
    </label>
    <div className="atal-search-filters" role="group" aria-label="Filtrar resultados">
      {searchCategories.map((kind) => <button type="button" key={kind} aria-pressed={category === kind}
        onClick={() => { setCategory(kind); setActiveIndex(0); }}>{kind}</button>)}
    </div>
    <div className="atal-command-results" aria-live="polite">
      {!term && category === 'Todos' && <p className="atal-command-heading">Ir rápidamente a…</p>}
      {entries.length
        ? entries.map(({ label, detail, href, icon: Icon, kind }, index) => (
          <div className="atal-command-peek-row" key={href}>
            <Link href={href} onClick={onClose} onMouseEnter={() => setActiveIndex(index)}
              className={index === selected ? 'is-keyboard-selected' : ''}>
              <span><Icon /></span><span><b>{label}</b><small>{detail}</small></span><ChevronRight />
            </Link>
            {(kind === 'Pacientes' || kind === 'Planes') && <button type="button"
              className="atal-command-peek-button" aria-label={`Vista rápida de ${label}`}
              onClick={(event) => {
                peekTrigger.current = event.currentTarget;
                setPeek({ kind: kind === 'Pacientes' ? 'patient' : 'plan', id: href.split('/').pop() ?? '', href });
              }}>
              <Eye aria-hidden="true" />
            </button>}
          </div>
        ))
        : <p>{!term ? 'Escribe para buscar en esta categoría.' : 'No encontramos resultados para esta búsqueda.'}</p>}
    </div>
    <div className="atal-command-hint" aria-hidden="true">↑ ↓ Elegir <span>·</span> Enter Abrir <span>·</span> Esc Cerrar</div>
    </>}
  </PanelFrame>;
}

function NotificationsPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const notifications=useAtalStore((state)=>state.notifications);const open=(id:string,href:string)=>{markNotificationRead(id);onNavigate(href)};
  return <PanelFrame title="Notificaciones" onClose={onClose}><div className="atal-notification-toolbar"><span>{notifications.filter((item)=>!item.read).length} sin leer</span><button type="button" disabled={!notifications.some((item)=>!item.read)} onClick={markAllNotificationsRead}>Marcar todas como leídas</button></div><div className="atal-notification-list">{notifications.map((item)=><button type="button" key={item.id} className={item.read?'is-read':''} onClick={()=>open(item.id,item.href)}><span className={item.severity==='urgent'||item.severity==='attention'?'is-warning':''}>{item.severity==='stable'?<CheckCircle2/>:<Activity/>}</span><span><b>{item.title}</b><small>{item.detail}</small></span><i>{new Date(item.createdAt).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</i></button>)}{!notifications.length&&<p className="atal-empty">No hay notificaciones todavía.</p>}</div></PanelFrame>;
}

function NewPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  return <PanelFrame title="Crear nuevo" onClose={onClose}><div className="atal-quick-actions"><button type="button" onClick={() => onNavigate('/patients/new')}><span><UserPlus /></span><span><b>Paciente</b><small>Crear un expediente clínico</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/plans/new')}><span><ClipboardList /></span><span><b>Plan</b><small>Diseñar una nueva rehabilitación</small></span><ChevronRight /></button><button type="button" onClick={() => onNavigate('/exercises/new')}><span><Dumbbell /></span><span><b>Ejercicio</b><small>Crear un ejercicio personalizado</small></span><ChevronRight /></button></div></PanelFrame>;
}

function AvatarMini() { return <span className="atal-avatar atal-avatar--md">CD</span>; }
