export type AssistantMessageBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] };

const headingPattern = /^(#{2,3})\s+(.+)$/;
const unorderedPattern = /^[-*]\s+(.+)$/;
const orderedPattern = /^\d+[.)]\s+(.+)$/;

export function parseAssistantMessage(value: string): AssistantMessageBlock[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: AssistantMessageBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (list?.items.length) blocks.push({ type: 'list', ordered: list.ordered, items: list.items });
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = headingPattern.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length as 2 | 3, text: heading[2].trim() });
      continue;
    }

    const unordered = unorderedPattern.exec(line);
    const ordered = orderedPattern.exec(line);
    const item = unordered?.[1] ?? ordered?.[1];
    if (item) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) {
        flushList();
        list = { ordered: orderedList, items: [] };
      }
      list.items.push(item.trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
