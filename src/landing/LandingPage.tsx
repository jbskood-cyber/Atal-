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
              <a className="atal-landing__button atal-landing__button--primary" href="#producto">
                {landingCopy.primaryCta}
              </a>
              <a className="atal-landing__button atal-landing__button--secondary" href="#flujo">
                {landingCopy.secondaryCta}
              </a>
            </div>
            <ul className="atal-landing__hero-facts" aria-label="Límites reales del producto">
              <li>Datos locales</li>
              <li>Cambios revisables</li>
              <li>Diseñado para fisioterapia</li>
            </ul>
          </div>

          <div id="producto" className="atal-landing__product-scene" aria-label="Vista sintética basada en pantallas reales de Atal">
            <div className="atal-landing__app-bar">
              <strong>Atal</strong>
              <span>Plan clínico</span>
            </div>
            <div className="atal-landing__plan-heading">
              <span className="atal-landing__patient-avatar">DO</span>
              <div>
                <strong>Rehabilitación — Fase 1</strong>
                <span>Paciente Demo 01 · Activo</span>
              </div>
            </div>
            <div className="atal-landing__plan-tabs" aria-hidden="true">
              <span>Resumen</span><strong>Ejercicios</strong><span>Progreso</span><span>Estado</span>
            </div>
            <div className="atal-landing__plan-meta">
              <div><span>Duración</span><strong>4 semanas</strong></div>
              <div><span>Frecuencia</span><strong>3× por semana</strong></div>
            </div>
            <div className="atal-landing__exercise-list">
              <div><span className="atal-landing__exercise-icon">✦</span><p><strong>Sentadilla asistida</strong><span>3 series · 10</span></p></div>
              <div><span className="atal-landing__exercise-icon">✦</span><p><strong>Elevación de pierna recta</strong><span>3 series · 10</span></p></div>
              <div><span className="atal-landing__exercise-icon">✦</span><p><strong>Puente de glúteos</strong><span>3 series · 12</span></p></div>
            </div>
            <div className="atal-landing__bottom-nav" aria-hidden="true">
              <span>Inicio</span><span>Pacientes</span><strong>Planes</strong><span>Más</span><span>Atal IA</span>
            </div>
          </div>
        </section>

        <section id="flujo" className="atal-landing__workflow" aria-labelledby="workflow-title">
          <div className="atal-landing__section-copy">
            <h2 id="workflow-title">Todo el proceso clínico en un solo lugar.</h2>
            <p>La landing muestra únicamente recorridos que ya existen en el producto y usa datos demostrativos, nunca información clínica real.</p>
          </div>
          <ol>
            {workflowSteps.map(([title, body], index) => (
              <li key={title}>
                <span className="atal-landing__step-number">{index + 1}</span>
                <div><strong>{title}</strong><p>{body}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <MobileProductEvidence />

        <section id="atal-ia" className="atal-landing__agent" aria-labelledby="agent-title">
          <div>
            <span className="atal-landing__agent-name">Atal IA <AtiSlot /></span>
            <h2 id="agent-title">{landingCopy.agentTitle}</h2>
            <p>Atal IA consulta el contexto disponible, prepara una propuesta y deja la decisión final en manos del profesional.</p>
            <a className="atal-landing__button atal-landing__button--primary" href="#confianza">
              {landingCopy.agentCta}
            </a>
          </div>
          <div className="atal-landing__agent-proof" aria-label="Ejemplo sintético de una acción revisable">
            <p>“Cambia la dosis de este ejercicio a 4 series de 10 y conserva el resto del plan.”</p>
            <div className="atal-landing__review-card">
              <span>Propuesta preparada</span>
              <strong>1 cambio pendiente de revisión</strong>
              <small>Confirmar · Editar · Cancelar</small>
            </div>
          </div>
        </section>

        <TrustLedger />

        <section className="atal-landing__final" aria-labelledby="final-title">
          <h2 id="final-title">{landingCopy.finalTitle}</h2>
          <div className="atal-landing__actions atal-landing__actions--centered">
            <a className="atal-landing__button atal-landing__button--primary" href="#producto">{landingCopy.primaryCta}</a>
            <a className="atal-landing__button atal-landing__button--secondary" href="#flujo">{landingCopy.secondaryCta}</a>
          </div>
          <p>Atal organiza el trabajo clínico; no diagnostica ni sustituye el juicio profesional.</p>
        </section>
      </main>

      <footer className="atal-landing__footer">
        <strong>Atal</strong>
        <a href="#producto">Producto</a>
        <a href="#flujo">Flujo clínico</a>
        <a href="#atal-ia">Atal IA</a>
        <a href="#confianza">Confianza</a>
      </footer>
    </div>
  );
}
