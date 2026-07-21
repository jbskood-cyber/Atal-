export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

export type PdfColor = [number, number, number];
export type PdfFontName = 'regular' | 'bold';
export type PdfEmbeddedImage = { key: string; bytes: Uint8Array; width: number; height: number };

type PdfPageData = {
  width: number;
  height: number;
  commands: string[];
  images: Map<string, PdfEmbeddedImage>;
};

const textEncoder = new TextEncoder();
const winAnsiSpecial = new Map<string, number>([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e],
  ['‘', 0x91], ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97],
  ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function formatNumber(value: number) {
  const fixed = Math.abs(value) < 0.0001 ? 0 : value;
  return Number(fixed.toFixed(3)).toString();
}

function colorCommand(color: PdfColor, stroke = false) {
  return `${color.map((component) => formatNumber(Math.max(0, Math.min(1, component)))).join(' ')} ${stroke ? 'RG' : 'rg'}`;
}

function winAnsiBytes(value: string) {
  const normalized = value.normalize('NFC');
  const bytes: number[] = [];
  for (const character of normalized) {
    const special = winAnsiSpecial.get(character);
    if (special !== undefined) { bytes.push(special); continue; }
    const code = character.codePointAt(0) ?? 63;
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) bytes.push(code);
    else if (character === '\n' || character === '\r' || character === '\t') bytes.push(32);
    else bytes.push(63);
  }
  return Uint8Array.from(bytes);
}

export function pdfHexString(value: string) {
  return `<${Array.from(winAnsiBytes(value)).map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}>`;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function ascii(value: string) { return textEncoder.encode(value); }

export function approximateTextWidth(text: string, fontSize: number, font: PdfFontName = 'regular') {
  const factor = font === 'bold' ? 0.56 : 0.51;
  return Array.from(text).reduce((width, character) => width + (character === ' ' ? fontSize * 0.28 : fontSize * factor), 0);
}

export function wrapPdfText(text: string, maxWidth: number, fontSize: number, font: PdfFontName = 'regular') {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (approximateTextWidth(candidate, fontSize, font) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      if (approximateTextWidth(word, fontSize, font) <= maxWidth) { line = word; continue; }
      let fragment = '';
      for (const character of word) {
        const next = `${fragment}${character}`;
        if (approximateTextWidth(next, fontSize, font) <= maxWidth) fragment = next;
        else { if (fragment) lines.push(fragment); fragment = character; }
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export class LocalPdfPage {
  constructor(private readonly page: PdfPageData) {}

  drawText(text: string, options: { x: number; y: number; size: number; font?: PdfFontName; color?: PdfColor }) {
    const font = options.font === 'bold' ? 'F2' : 'F1';
    const color = options.color ?? [0.12, 0.14, 0.13];
    this.page.commands.push(`BT ${colorCommand(color)} /${font} ${formatNumber(options.size)} Tf 1 0 0 1 ${formatNumber(options.x)} ${formatNumber(options.y)} Tm ${pdfHexString(text)} Tj ET`);
  }

  drawRect(options: { x: number; y: number; width: number; height: number; fill: PdfColor; radius?: number }) {
    const { x, y, width, height, fill } = options;
    this.page.commands.push(`q ${colorCommand(fill)} ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re f Q`);
  }

  strokeRect(options: { x: number; y: number; width: number; height: number; stroke: PdfColor; lineWidth?: number }) {
    const { x, y, width, height, stroke } = options;
    this.page.commands.push(`q ${colorCommand(stroke, true)} ${formatNumber(options.lineWidth ?? 1)} w ${formatNumber(x)} ${formatNumber(y)} ${formatNumber(width)} ${formatNumber(height)} re S Q`);
  }

  drawLine(options: { x1: number; y1: number; x2: number; y2: number; stroke: PdfColor; lineWidth?: number }) {
    this.page.commands.push(`q ${colorCommand(options.stroke, true)} ${formatNumber(options.lineWidth ?? 1)} w ${formatNumber(options.x1)} ${formatNumber(options.y1)} m ${formatNumber(options.x2)} ${formatNumber(options.y2)} l S Q`);
  }

  drawImage(image: PdfEmbeddedImage, options: { x: number; y: number; width: number; height: number }) {
    this.page.images.set(image.key, image);
    this.page.commands.push(`q ${formatNumber(options.width)} 0 0 ${formatNumber(options.height)} ${formatNumber(options.x)} ${formatNumber(options.y)} cm /${image.key} Do Q`);
  }
}

export class LocalPdfDocument {
  private readonly pages: PdfPageData[] = [];
  private readonly metadata: { title: string; author: string; subject: string; createdAt: string };

  constructor(metadata: { title: string; author: string; subject: string; createdAt: string }) {
    this.metadata = metadata;
  }

  addPage(width = A4_WIDTH, height = A4_HEIGHT) {
    const page: PdfPageData = { width, height, commands: [], images: new Map() };
    this.pages.push(page);
    return new LocalPdfPage(page);
  }

  get pageCount() { return this.pages.length; }

  save() {
    if (!this.pages.length) throw new Error('El PDF no contiene páginas.');

    const imageByKey = new Map<string, PdfEmbeddedImage>();
    for (const page of this.pages) for (const image of page.images.values()) imageByKey.set(image.key, image);

    const catalogId = 1;
    const pagesId = 2;
    const regularFontId = 3;
    const boldFontId = 4;
    const infoId = 5;
    let nextId = 6;
    const imageIds = new Map<string, number>();
    for (const key of imageByKey.keys()) imageIds.set(key, nextId++);
    const pageRefs = this.pages.map(() => ({ contentId: nextId++, pageId: nextId++ }));
    const objectCount = nextId - 1;
    const objects = new Map<number, Uint8Array>();

    objects.set(catalogId, ascii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`));
    objects.set(pagesId, ascii(`<< /Type /Pages /Count ${this.pages.length} /Kids [${pageRefs.map((reference) => `${reference.pageId} 0 R`).join(' ')}] >>`));
    objects.set(regularFontId, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
    objects.set(boldFontId, ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
    const creationDate = this.metadata.createdAt.replace(/[-:TZ.]/g, '').slice(0, 14);
    objects.set(infoId, ascii(`<< /Title ${pdfHexString(this.metadata.title)} /Author ${pdfHexString(this.metadata.author)} /Subject ${pdfHexString(this.metadata.subject)} /Creator ${pdfHexString('Atal')} /Producer ${pdfHexString('Atal Local PDF Engine')} /CreationDate (D:${creationDate}) >>`));

    for (const [key, image] of imageByKey) {
      const header = ascii(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
      objects.set(imageIds.get(key)!, concatBytes([header, image.bytes, ascii('\nendstream')]));
    }

    this.pages.forEach((page, index) => {
      const reference = pageRefs[index];
      const content = ascii(`${page.commands.join('\n')}\n`);
      objects.set(reference.contentId, concatBytes([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii('endstream')]));
      const xObjects = Array.from(page.images.keys()).map((key) => `/${key} ${imageIds.get(key)} 0 R`).join(' ');
      const resources = `<< /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >>${xObjects ? ` /XObject << ${xObjects} >>` : ''} >>`;
      objects.set(reference.pageId, ascii(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}] /Resources ${resources} /Contents ${reference.contentId} 0 R >>`));
    });

    const chunks: Uint8Array[] = [Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
    const offsets = new Array<number>(objectCount + 1).fill(0);
    let total = chunks[0].length;
    for (let id = 1; id <= objectCount; id++) {
      const body = objects.get(id);
      if (!body) throw new Error(`Objeto PDF faltante: ${id}`);
      offsets[id] = total;
      const objectBytes = concatBytes([ascii(`${id} 0 obj\n`), body, ascii('\nendobj\n')]);
      chunks.push(objectBytes);
      total += objectBytes.length;
    }

    const xrefOffset = total;
    const xref = [`xref\n0 ${objectCount + 1}\n`, '0000000000 65535 f \n'];
    for (let id = 1; id <= objectCount; id++) xref.push(`${offsets[id].toString().padStart(10, '0')} 00000 n \n`);
    xref.push(`trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
    chunks.push(ascii(xref.join('')));
    return concatBytes(chunks);
  }
}
