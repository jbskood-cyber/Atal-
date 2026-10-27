import { ClipboardList, FileText, MessageCircle, UsersRound } from 'lucide-react';

/**
 * The start surface has exactly two zero-provider navigation shortcuts and
 * two editable prompt suggestions. Clicking a prompt never sends it.
 */
export function AIQuickStarts({
  onNavigate,
  onPrompt,
}: {
  onNavigate: (path: string) => void;
  onPrompt: (text: string) => void;
}) {
  const actions = [
    { label: 'Ver pacientes', hint: 'Abrir expedientes', icon: UsersRound, run: () => onNavigate('/patients') },
    { label: 'Ver reportes', hint: 'Consultar seguimiento', icon: FileText, run: () => onNavigate('/activity?view=reports') },
    { label: 'Preparar un plan', hint: 'Escribir solicitud para IA', icon: ClipboardList, run: () => onPrompt('Ayúdame a preparar un plan de tratamiento. Pregúntame los datos que necesites antes de proponer cambios.') },
    { label: 'Preguntar a Atal IA', hint: 'Explicar qué necesito', icon: MessageCircle, run: () => onPrompt('Necesito ayuda con ') },
  ];
  return <section className="atal-ai-quick-starts" aria-label="Empezar fácilmente con Atal IA">
    <p>Empieza por una tarea</p>
    <div>
      {actions.map(({ label, hint, icon: Icon, run }) => <button key={label} type="button" onClick={run}>
        <Icon aria-hidden="true" />
        <span><strong>{label}</strong><small>{hint}</small></span>
      </button>)}
    </div>
  </section>;
}
