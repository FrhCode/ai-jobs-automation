import path from 'node:path';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function parseResume(filePath: string): Promise<string> {
  const absPath = path.resolve(filePath);
  const file = Bun.file(absPath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`Resume not found at: ${absPath}`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = await pdfParse(Buffer.from(arrayBuffer));

  const text = data.text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  console.log(`[Resume] Parsed ${text.length} characters from ${path.basename(absPath)}`);
  return text;
}

export async function parseResumeBuffer(buffer: Buffer, filename: string): Promise<string> {
  const data = await pdfParse(buffer);

  const text = data.text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  console.log(`[Resume] Parsed ${text.length} characters from ${filename}`);
  return text;
}
