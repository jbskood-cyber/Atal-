import { useEffect, useRef, useState } from 'react';

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <header className="atal-landing__header">
      <a className="atal-landing__brand" href="/landing" aria-label="Atal, inicio">Atal</a>
      <button
        ref={triggerRef}
        className="atal-landing__menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="landing-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="atal-landing__menu-label">Menú</span>
        <span aria-hidden="true" className="atal-landing__menu-icon">
          <span />
          <span />
        </span>
      </button>
      <nav
        id="landing-navigation"
        className={open ? 'atal-landing__nav is-open' : 'atal-landing__nav'}
        aria-label="Navegación principal"
      >
        <a ref={firstLinkRef} href="#flujo" onClick={closeMenu}>Producto</a>
        <a href="#atal-ia" onClick={closeMenu}>Atal IA</a>
        <a className="atal-landing__nav-cta" href="#flujo" onClick={closeMenu}>Ver Atal en acción</a>
      </nav>
      {open ? <button className="atal-landing__nav-backdrop" type="button" aria-label="Cerrar menú" onClick={closeMenu} /> : null}
    </header>
  );
}
