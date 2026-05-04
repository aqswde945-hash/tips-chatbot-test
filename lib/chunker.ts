export interface Chunk {
  id: string;
  text: string;
}

export function chunkText(text: string, chunkSize = 1500, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push({ id: `chunk-${index++}`, text: chunk });
    }
    if (end === text.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}
