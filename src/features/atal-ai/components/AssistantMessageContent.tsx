import { Fragment, type ReactNode } from 'react';
import { parseAssistantMessage } from '../core/agentic/messageFormatting';

function inlineContent(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) return <code key={`${index}-${token}`}>{token.slice(1, -1)}</code>;
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={`${index}-${token}`}>{token.slice(2, -2)}</strong>;
    return <Fragment key={`${index}-${token}`}>{token}</Fragment>;
  });
}

export function AssistantMessageContent({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseAssistantMessage(text);
  return <div className={`atal-assistant-rich-text${streaming ? ' is-streaming' : ''}`} aria-live={streaming ? 'polite' : undefined}>
    {blocks.map((block, index) => {
      if (block.type === 'heading') {
        const content = inlineContent(block.text);
        return block.level === 2
          ? <h2 key={`${block.type}-${index}`}>{content}</h2>
          : <h3 key={`${block.type}-${index}`}>{content}</h3>;
      }
      if (block.type === 'list') {
        const List = block.ordered ? 'ol' : 'ul';
        return <List key={`${block.type}-${index}`}>{block.items.map((item) => <li key={item}>{inlineContent(item)}</li>)}</List>;
      }
      return <p key={`${block.type}-${index}`}>{inlineContent(block.text)}</p>;
    })}
    {streaming && <span className="atal-streaming-caret" aria-hidden="true" />}
  </div>;
}
