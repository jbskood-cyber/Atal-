export function AtalMark({ className = '' }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 31.8C25.1 28.1 20.9 22.9 21.2 16.9C21.5 10.8 25.8 7 31.1 7.2C36.5 7.4 40.3 11.6 40 16.9C39.7 22.7 35.7 27.8 32 31.8Z" />
      <path d="M32.2 32C35.9 25.1 41.1 20.9 47.1 21.2C53.2 21.5 57 25.8 56.8 31.1C56.6 36.5 52.4 40.3 47.1 40C41.3 39.7 36.2 35.7 32.2 32Z" />
      <path d="M32 32.2C38.9 35.9 43.1 41.1 42.8 47.1C42.5 53.2 38.2 57 32.9 56.8C27.5 56.6 23.7 52.4 24 47.1C24.3 41.3 28.3 36.2 32 32.2Z" />
      <path d="M31.8 32C28.1 38.9 22.9 43.1 16.9 42.8C10.8 42.5 7 38.2 7.2 32.9C7.4 27.5 11.6 23.7 16.9 24C22.7 24.3 27.8 28.3 31.8 32Z" />
    </g>
  </svg>;
}

export function AtalLogo({ compact = false }: { compact?: boolean }) {
  return <div aria-label="Atal Fisioterapia" className="atal-logo"><AtalMark className="atal-logo__mark" />{!compact&&<div><div className="atal-logo__name">Atal</div><div className="atal-logo__descriptor">Fisioterapia</div></div>}</div>;
}
