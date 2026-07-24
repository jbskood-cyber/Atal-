import fs from 'node:fs';

const path = 'src/features/atal-ai/AtalAIGeneralScreen.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`No se encontró el ancla: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "import { ConversationalDraftCard } from './components/ConversationalDraftCard';\n",
  "import { ConversationalDraftCard } from './components/ConversationalDraftCard';\nimport { AssistantMessageContent } from './components/AssistantMessageContent';\n",
  'import AssistantMessageContent',
);

replaceOnce(
  "  const [processing, setProcessing] = useState(false);\n",
  "  const [processing, setProcessing] = useState(false);\n  const [streamingText, setStreamingText] = useState('');\n",
  'streaming state',
);

replaceOnce(
  "    setProcessing(true);\n    setNotice('');\n    patchConversation({ status: 'processing', composerText: '', transcription: '', error: undefined });\n",
  "    setProcessing(true);\n    setStreamingText('');\n    setNotice('');\n    patchConversation({ status: 'processing', composerText: '', transcription: '', error: undefined });\n",
  'start streamed request',
);

replaceOnce(
  "        task: conversation.agentTask,\n        signal: controller.signal,\n",
  "        task: conversation.agentTask,\n        signal: controller.signal,\n        onTextDelta: (delta) => setStreamingText((current) => current + delta),\n",
  'stream callback',
);

replaceOnce(
  "      await applyAgentOutcome(outcome, userMessage);\n    } catch (cause) {\n",
  "      await applyAgentOutcome(outcome, userMessage);\n      setStreamingText('');\n    } catch (cause) {\n      setStreamingText('');\n",
  'clear stream after request',
);

replaceOnce(
  "        task,\n        confirmation: {\n",
  "        task,\n        onTextDelta: (delta) => setStreamingText((current) => current + delta),\n        confirmation: {\n",
  'confirmation stream callback',
);

replaceOnce(
  "    setProcessing(true);\n    try {\n      const outcome = await confirmAndContinueAtalAgent({\n",
  "    setProcessing(true);\n    setStreamingText('');\n    try {\n      const outcome = await confirmAndContinueAtalAgent({\n",
  'start confirmation stream',
);

replaceOnce(
  "      setDialog(null);\n      await applyAgentOutcome(outcome);\n    } catch (cause) {\n",
  "      setDialog(null);\n      await applyAgentOutcome(outcome);\n      setStreamingText('');\n    } catch (cause) {\n      setStreamingText('');\n",
  'clear confirmation stream',
);

replaceOnce(
  "        <div><header><b>{item.role === 'assistant' ? 'Atal IA' : 'Tú'}</b><time>{new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time></header><p>{item.text}</p>{item.attachments.length > 0 && <div className=\"atal-command-message-files\">{item.attachments.map((file) => <small key={file.id}><Paperclip />{file.name}</small>)}</div>}</div>\n      </article>)}\n      {(processing || conversation.status === 'processing') && <div className=\"atal-command-processing\"",
  "        <div><header><b>{item.role === 'assistant' ? 'Atal IA' : 'Tú'}</b><time>{new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time></header>{item.role === 'assistant' ? <AssistantMessageContent text={item.text} /> : <p>{item.text}</p>}{item.attachments.length > 0 && <div className=\"atal-command-message-files\">{item.attachments.map((file) => <small key={file.id}><Paperclip />{file.name}</small>)}</div>}</div>\n      </article>)}\n      {streamingText && <article className=\"atal-command-message is-assistant is-streaming\"><span><AtalMark /></span><div><header><b>Atal IA</b><time>ahora</time></header><AssistantMessageContent text={streamingText} streaming /></div></article>}\n      {(processing || conversation.status === 'processing') && !streamingText && <div className=\"atal-command-processing\"",
  'formatted and streamed messages',
);

fs.writeFileSync(path, source);
console.log(`Actualizado ${path}`);
