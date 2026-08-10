type AtiSlotProps = {
  assetUrl?: string;
  className?: string;
};

export function AtiSlot({ assetUrl, className = '' }: AtiSlotProps) {
  if (!assetUrl) return null;

  return (
    <span className={`atal-landing__ati ${className}`.trim()} aria-label="Ati, asistente visual de Atal">
      <img
        src={assetUrl}
        alt=""
        width="36"
        height="36"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
