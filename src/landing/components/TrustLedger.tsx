const trustItems = [
  ['Cambios revisables', 'Las acciones sensibles se presentan antes de aplicarse.'],
  ['Mismo núcleo', 'La interfaz y Atal IA usan las mismas operaciones canónicas.'],
  ['Deshacer', 'Las acciones compatibles conservan una vía clara para revertirse.'],
  ['Contexto separado', 'Las conversaciones generales y contextuales no mezclan historiales.'],
] as const;

export function TrustLedger() {
  return (
    <section id="confianza" className="atal-landing__trust" aria-labelledby="trust-title">
      <div className="atal-landing__section-copy">
        <h2 id="trust-title">Asistencia con límites visibles.</h2>
        <p>
          Atal IA ayuda a operar el producto sin ocultar qué se propone, qué se aplicó y qué puede
          revertirse.
        </p>
      </div>
      <dl className="atal-landing__trust-list">
        {trustItems.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
