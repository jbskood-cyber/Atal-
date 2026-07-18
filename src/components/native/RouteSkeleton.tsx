import { useLocation } from 'react-router-dom';

export function RouteSkeleton() {
  const { pathname } = useLocation();
  const variant = pathname === '/' ? 'home' : pathname === '/patients' ? 'patients' : /^\/patients\/[^/]+$/.test(pathname) ? 'profile' : pathname === '/plans' ? 'plans' : pathname.startsWith('/plans/') ? 'plan' : pathname === '/activity' ? 'activity' : pathname === '/assistant' ? 'assistant' : pathname.includes('/session') ? 'session' : pathname.startsWith('/exercises') ? 'exercises' : 'settings';
  return <main className={`atal-screen-skeleton is-${variant}`} role="status" aria-label="Cargando contenido">
    <div className="atal-skeleton-head"><i /><span /></div>
    {(variant === 'patients' || variant === 'plans' || variant === 'activity' || variant === 'exercises') && <div className="atal-skeleton-search" />}
    {(variant === 'home' || variant === 'profile' || variant === 'session') && <div className="atal-skeleton-hero"><i /><span /><span /></div>}
    <div className="atal-skeleton-list">{Array.from({ length: variant === 'assistant' ? 3 : 5 }, (_, index) => <div key={index}><i /><span /><span /></div>)}</div>
    {variant === 'assistant' && <div className="atal-skeleton-composer" />}
    <span className="sr-only">Cargando</span>
  </main>;
}
