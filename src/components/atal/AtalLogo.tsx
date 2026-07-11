import { Flower2 } from 'lucide-react';

export function AtalLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-label="Atal Fisioterapia" className="atal-logo">
      <Flower2 aria-hidden="true" className="atal-logo__mark" strokeWidth={2.45} />
      {!compact && (
        <div>
          <div className="atal-logo__name">Atal</div>
          <div className="atal-logo__descriptor">Fisioterapia</div>
        </div>
      )}
    </div>
  );
}
