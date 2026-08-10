const sessionMetrics = [
  ['Dolor', '3/10'],
  ['Energía', '7/10'],
  ['Esfuerzo', 'Moderado'],
] as const;

export function MobileProductEvidence() {
  return (
    <section id="movil" className="atal-landing__mobile" aria-labelledby="mobile-title">
      <div className="atal-landing__section-copy">
        <h2 id="mobile-title">El seguimiento continúa donde ocurre la sesión.</h2>
        <p>
          La experiencia móvil conserva el plan, la dosis y el contexto del paciente sin convertir
          cada paso en un formulario nuevo.
        </p>
      </div>

      <div className="atal-landing__phone" aria-label="Vista sintética de una sesión guiada en Atal">
        <div className="atal-landing__phone-topline">
          <span>Sesión guiada</span>
          <span>2 de 4</span>
        </div>
        <div className="atal-landing__phone-exercise">
          <small>Ejercicio actual</small>
          <strong>Puente de glúteo</strong>
          <span>3 series · 12 repeticiones</span>
        </div>
        <div className="atal-landing__phone-progress" aria-hidden="true">
          <span />
        </div>
        <dl>
          {sessionMetrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
