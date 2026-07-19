import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, LoaderCircle, Plus, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';

type Tone = 'stable' | 'attention' | 'urgent' | 'neutral';

export function MobileAppHeader({ title, eyebrow, onBack, leading, actions, children }: { title: string; eyebrow?: string; onBack?: () => void; leading?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return <header className="native-header">
    <div className="native-header__main">
      {onBack ? <button type="button" className="native-icon-button" onClick={onBack} aria-label="Volver"><ArrowLeft /></button> : leading}
      <div className="native-header__copy">{eyebrow && <small>{eyebrow}</small>}<h1>{title}</h1>{children}</div>
      {actions && <div className="native-header__actions">{actions}</div>}
    </div>
  </header>;
}

export function GroupedList({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`native-group ${className}`}>{(title || action) && <header><h2>{title}</h2>{action}</header>}<div className="native-group__body">{children}</div></section>;
}

export function ClinicalListRow({ leading, title, subtitle, meta, trailing, onClick, tone = 'neutral', disabled, ariaLabel }: { leading?: ReactNode; title: string; subtitle?: string; meta?: string; trailing?: ReactNode; onClick?: () => void; tone?: Tone; disabled?: boolean; ariaLabel?: string }) {
  const content = <><span className="native-clinical-row__leading">{leading}</span><span className="native-clinical-row__copy"><b>{title}</b>{subtitle && <small>{subtitle}</small>}{meta && <em>{meta}</em>}</span><span className="native-clinical-row__trailing">{trailing ?? (onClick ? <ChevronRight /> : null)}</span></>;
  return onClick ? <button type="button" className={`native-clinical-row is-${tone}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel ?? title}>{content}</button> : <div className={`native-clinical-row is-${tone}`}>{content}</div>;
}

export function PriorityBanner({ tone, eyebrow, title, detail, metric, action, onAction, avatar }: { tone: Exclude<Tone, 'neutral'>; eyebrow: string; title: string; detail: string; metric?: string; action: string; onAction: () => void; avatar?: ReactNode }) {
  return <section className={`native-priority is-${tone}`} aria-label={`${eyebrow}: ${title}`}><div className="native-priority__head"><span>{eyebrow}</span>{metric && <strong>{metric}</strong>}</div><div className="native-priority__content"><div>{avatar}<h2>{title}</h2><p>{detail}</p></div><button type="button" onClick={onAction}>{action}<ChevronRight /></button></div></section>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string | number; icon: ReactNode; onClick?: () => void; tone?: Tone }> }) {
  return <section className="native-metric-strip" aria-label="Métricas actuales">{items.map((item) => <button key={item.label} type="button" disabled={!item.onClick} onClick={item.onClick} className={`is-${item.tone ?? 'neutral'}`}><span>{item.icon}</span><strong>{item.value}</strong><small>{item.label}</small></button>)}</section>;
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) { return <span className={`native-status is-${tone}`}>{children}</span>; }

export function NativeSearchField({ value, onChange, placeholder = 'Buscar', onFilter, autoFocus = false }: { value: string; onChange: (value: string) => void; placeholder?: string; onFilter?: () => void; autoFocus?: boolean }) {
  return <label className="native-search"><Search /><input autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{onFilter && <button type="button" onClick={onFilter} aria-label="Abrir filtros"><SlidersHorizontal aria-hidden /></button>}</label>;
}

export function SegmentedTabs<T extends string>({ value, items, onChange, label }: { value: T; items: Array<{ value: T; label: string; count?: number }>; onChange: (value: T) => void; label: string }) {
  return <div className="native-segments" role="tablist" aria-label={label}>{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} className={value === item.value ? 'is-active' : ''} onClick={() => onChange(item.value)}>{item.label}{item.count !== undefined && <small>{item.count}</small>}</button>)}</div>;
}

export function InlineAIRecommendation({ title, detail, action, onAction }: { title: string; detail: string; action: string; onAction: () => void }) {
  return <section className="native-ai-recommendation"><span aria-hidden><Sparkles /></span><div><small>Recomendación de Atal IA</small><b>{title}</b><p>{detail}</p></div><button type="button" onClick={onAction}>{action}<ChevronRight /></button></section>;
}

export function StickyActionBar({ children }: { children: ReactNode }) { return <div className="native-sticky-action">{children}</div>; }

export function EmptyState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) { return <section className="native-state"><span aria-hidden><Plus /></span><h2>{title}</h2><p>{detail}</p>{action && onAction && <button type="button" onClick={onAction}>{action}</button>}</section>; }
export function ErrorState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) { return <section className="native-state is-error"><AlertTriangle /><h2>{title}</h2><p>{detail}</p>{onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}</section>; }
export function Skeleton({ lines = 3 }: { lines?: number }) { return <div className="native-skeleton" aria-label="Cargando" role="status">{Array.from({ length: lines }, (_, index) => <i key={index} />)}</div>; }

export function Toast({ children, onClose }: { children: ReactNode; onClose?: () => void }) { return <div className="native-toast" role="status"><Check />{children}{onClose && <button type="button" onClick={onClose} aria-label="Cerrar"><X /></button>}</div>; }
export function UndoToast({ children, onUndo }: { children: ReactNode; onUndo: () => void }) { return <div className="native-toast" role="status"><Check />{children}<button type="button" onClick={onUndo}>Deshacer</button></div>; }

export function BottomSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('atal-context-active');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      document.body.classList.remove('atal-context-active');
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return <div className="native-overlay" onMouseDown={onClose}><section className="native-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><header><h2 id={titleId}>{title}</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar"><X /></button></header>{children}</section></div>;
}

export function ConfirmationDialog({ open, title, detail, confirm, busy = false, onConfirm, onCancel }: { open: boolean; title: string; detail: string; confirm: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <BottomSheet open={open} title={title} onClose={onCancel}><p className="native-confirm-copy">{detail}</p><div className="native-confirm-actions"><button type="button" className="is-primary" disabled={busy} onClick={onConfirm}>{busy && <LoaderCircle className="is-spinning" />}{confirm}</button><button type="button" onClick={onCancel}>Cancelar</button></div></BottomSheet>;
}

export function ContextMenu({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) { return <BottomSheet open={open} title={title} onClose={onClose}><div className="native-context-menu">{children}</div></BottomSheet>; }

export function AvatarOrInitials({ name, src, id, size = 'md' }: { name: string; src?: string; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AT';
  const hue = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 38 + 142;
  return <span className={`native-avatar is-${size}`} style={{ '--avatar-hue': hue } as React.CSSProperties}>{src ? <img src={src} alt="" /> : initials}</span>;
}

export function NativeActionButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} className={`native-action ${className}`}>{children}</button>; }
