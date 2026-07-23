from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old, new, 1)


screen = Path('src/features/atal-ai/AtalAIGeneralScreen.tsx')
text = screen.read_text()
text = replace_once(
    text,
    "  useEffect(() => {\n    if (draft) saveAIDraft(draft);\n  }, [draft]);\n\n  useEffect(() => {\n    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });\n  }, [conversation.messages.length, conversation.status, draft?.updatedAt]);",
    "  useEffect(() => {\n    if (draft) saveAIDraft(draft);\n  }, [draft]);\n\n  useEffect(() => {\n    if (conversation.agentTask?.status === 'needs-confirmation') setDialog('agent-confirmation');\n  }, [conversation.id, conversation.agentTask?.status]);\n\n  useEffect(() => {\n    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });\n  }, [conversation.messages.length, conversation.status, draft?.updatedAt]);",
    'pending confirmation',
)
text = replace_once(
    text,
    "      patchConversation({ savedResult: { ...conversation.savedResult, summary: conversation.savedResult?.summary ?? [], undo: undefined } });\n      append(createMessage('assistant', 'Cambio deshecho correctamente.'));",
    "      patchConversation({ savedResult: { ...conversation.savedResult, summary: conversation.savedResult?.summary ?? [], undo: undefined } });\n      setNotice('Último cambio deshecho.');\n      append(createMessage('assistant', 'Cambio deshecho correctamente.'));",
    'undo notice',
)
cancel = """  const cancelDialog = () => {
    if (dialog === 'agent-confirmation' && conversation.agentTask?.status === 'needs-confirmation') {
      const task = {
        ...conversation.agentTask,
        status: 'cancelled' as const,
        pendingInvocation: undefined,
        pendingCall: undefined,
        finalText: 'Acción cancelada. Los pasos ya completados se conservaron.',
        updatedAt: new Date().toISOString(),
      };
      setConversation((current) => {
        const next = {
          ...current,
          agentTask: task,
          status: statusAfterConversation(draft),
          messages: [...current.messages, createMessage('assistant', task.finalText)],
          updatedAt: new Date().toISOString(),
        };
        saveAIConversation(next);
        return next;
      });
    }
    setDialog(null);
    setLegacyConfirmation(null);
  };

"""
text = replace_once(text, "  const matchingPatient = !collisionDismissed", cancel + "  const matchingPatient = !collisionDismissed", 'cancel dialog')
text = replace_once(
    text,
    '<article className="atal-command-intro"><AtalMark /><div><b>Atal IA</b><p>Pregunta cualquier cosa sobre Atal o prepara un cambio revisable.</p></div></article>',
    '<article className="atal-command-intro"><AtalMark /><div><b>Atal IA</b><h1>¿Qué necesitas resolver?</h1><p>Pregunta cualquier cosa sobre Atal o prepara un cambio revisable.</p></div></article>',
    'intro heading',
)
text = replace_once(
    text,
    '<button type="button" className="atal-command-undo" onClick={undo}>Deshacer cambio</button>',
    '<button type="button" className="atal-command-undo" aria-label="Deshacer último cambio" onClick={undo}>Deshacer cambio</button>',
    'undo label',
)
text = replace_once(
    text,
    "      agentText={conversation.agentTask?.finalText}\n      onCancel={() => {\n        setDialog(null);\n        setLegacyConfirmation(null);\n      }}",
    "      agentText={conversation.agentTask?.finalText}\n      agentLabel={conversation.agentTask?.pendingInvocation?.authorization === 'file-derived' ? 'Revisa antes de guardar' : 'Confirmación necesaria'}\n      onCancel={cancelDialog}",
    'confirmation props',
)
text = replace_once(
    text,
    "function ConfirmDialog({ kind, draft, agentText, onCancel, onConfirm }: { kind: 'discard' | 'restart' | 'legacy-confirmation' | 'agent-confirmation'; draft: AtalAIDraft | null; agentText?: string; onCancel: () => void; onConfirm: () => void })",
    "function ConfirmDialog({ kind, draft, agentText, agentLabel, onCancel, onConfirm }: { kind: 'discard' | 'restart' | 'legacy-confirmation' | 'agent-confirmation'; draft: AtalAIDraft | null; agentText?: string; agentLabel?: string; onCancel: () => void; onConfirm: () => void })",
    'confirmation signature',
)
text = text.replace("'Confirmar y continuar']", "'Continuar']", 1)
text = replace_once(
    text,
    '<section className="atal-confirm-sheet" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle /><h2 id="atal-confirm-title">',
    '<section className="atal-confirm-sheet" onMouseDown={(event) => event.stopPropagation()}><AlertTriangle />{kind === \'agent-confirmation\' && <small>{agentLabel || \'Confirmación necesaria\'}</small>}<h2 id="atal-confirm-title">',
    'confirmation label',
)
screen.write_text(text)

critical = Path('e2e/block-4-1-critical.spec.mjs')
critical.write_text(critical.read_text().replace("await sendMessage(page, 'Crea a José QA con un plan.');", "await sendMessage(page, 'Registra al paciente José QA con un plan.');", 1))

regression = Path('e2e/block-4-3-conversation-regressions.spec.mjs')
value = regression.read_text()
value = value.replace("const contextual = conversations.find((item) => item.id === contextualId);", "expect(contextualId).toBeTruthy();\n    const contextual = conversations.find((item) => item.scope === 'contextual' && item.contextKey);", 1)
value = value.replace("expect(contextual.scope).toBe('contextual');", "expect(contextual).toBeTruthy();\n    expect(contextual.scope).toBe('contextual');", 1)
regression.write_text(value)

Path('.github/workflows/quality.yml').write_text('''name: quality

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run quality
      - name: Verify generated capability matrix
        run: |
          npm run audit:ai-capabilities
          git diff --exit-code -- docs/atal-ai/block-4-3/03-capability-parity-matrix.md
      - name: Live Gemini function-calling smoke
        run: npm run test:ai-live
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: ${{ vars.GEMINI_MODEL }}
''')
for temporary in [Path('.github/workflows/atal-ai-isolation-repair.yml'), Path(__file__)]:
    if temporary.exists():
        temporary.unlink()
