export interface Chunk {
  id: string;
  text: string;
}

export function chunkText(text: string, maxSize = 1000): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  let current = '';

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 10);

  for (const line of lines) {
    if (current.length + line.length > maxSize && current.length > 0) {
      chunks.push({ id: `chunk-${index++}`, text: current.trim() });
      current = '';
    }
    current += (current ? ' ' : '') + line;
  }

  if (current.trim().length > 10) {
    chunks.push({ id: `chunk-${index++}`, text: current.trim() });
  }

  return chunks;
}
