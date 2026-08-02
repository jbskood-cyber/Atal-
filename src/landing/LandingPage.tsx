import './landing.css';
import './evidence.css';
import { AtiSlot } from './components/AtiSlot';
import { LandingNav } from './components/LandingNav';
import { MobileProductEvidence } from './components/MobileProductEvidence';
import { TrustLedger } from './components/TrustLedger';
import { landingCopy, workflowSteps } from './content';

export default function LandingPage() {
  return (
    <div className="atal-landing">
      <a className="atal-landing__skip" href="#contenido">Saltar al contenido</a>
      <LandingNav />

      <main id="contenido">
        <section className="atal-landing__hero" aria-labelledby="landing-title">
          <div className="atal-landing__hero-copy">
            <h1 id="landing-title">{landingCopy.heroTitle}</h1>
            <p>{landingCopy.heroBody}</p>
            <div className="atal-landing__actions">
              <a className="atal-landing__button atal-landing__button--primary" href="#flujo">
                {landingCopy.primaryCta}
              </a>
              <a className="atal-landing__button atal-landing__button--secondary" href="#atal-ia">
                {landingCopy.secondaryCta}
              </a>
            </div>
          </div>
          <div className="atal-landing__product-scene" aria-label="Vista sintética del flujo clínico de Atal">
            <div className="atal-landing__scene-header">Paciente · Francisco</div>
            <div className="atal-landing__scene-body">
              <strong>Plan activo</strong>
              <span>Movilidad y fuerza · 4 semanas</span>
              <span>3 sesiones por semana</span>
            </div>
          </div>
        </section>

        <section className="atal-landing__fragmentation" aria-labelledby="fragmentation-title">
          <h2 id="fragmentation-title">Menos trabajo fragmentado alrededor del paciente.</h2>
          <p>Notas, mensajes, documentos y seguimiento dejan de competir por el contexto clínico.</p>
          <div className="atal-landing__fragmentation-flow" aria-label="El trabajo fragmentado converge en Atal">
            <span>Notas</span>
            <span>Mensajes</span>
            <span>Documentos</span>
            <span>Seguimiento</span>
            <strong>Atal</strong>
          </div>
        </section>

        <section id="flujo" className="atal-landing__workflow" aria-labelledby="workflow-title">
          <div className="atal-landing__section-copy">
            <h2 id="workflow-title">Un paciente. Un flujo conectado.</h2>
            <p>Desde el primer registro hasta el reporte, cada paso conserva el contexto necesario para continuar.</p>
          </div>
          <ol>
            {workflowSteps.map(([title, body]) => (
              <li key={title}>
                <span>{title}</span>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="atal-ia" className="atal-landing__agent" aria-labelledby="agent-title">
          <div>
            <span className="atal-landing__agent-name">
              Atal IA
              <AtiSlot />
            </span>
            <h2 id="agent-title">{landingCopy.agentTitle}</h2>
            <p>Consulta el contexto, prepara acciones revisables y usa las mismas operaciones que la interfaz.</p>
          </div>
          <div className="atal-landing__agent-proof" aria-label="Ejemplo sintético de Atal IA">
            <p>“Cambia ese ejercicio a 4 series de 10 y no modifiques el resto del plan.”</p>
            <button type="button">Aplicar cambios</button>
            <small>Cambios aplicados · Deshacer</small>
          </div>
        </section>

        <MobileProductEvidence />
        <TrustLedger />

        <section className="atal-landing__final" aria-labelledby="final-title">
          <h2 id="final-title">{landingCopy.finalTitle}</h2>
          <a className="atal-landing__button atal-landing__button--primary" href="#flujo">
            {landingCopy.primaryCta}
          </a>
          <p>Atal apoya la organización operativa y no sustituye el juicio clínico profesional.</p>
        </section>
      </main>

      <footer className="atal-landing__footer">
        <span>Atal</span>
        <a href="#flujo">Producto</a>
        <a href="#atal-ia">Atal IA</a>
        <a href="#confianza">Confianza</a>
      </footer>
    </div>
  );
}
