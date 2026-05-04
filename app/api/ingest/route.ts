import { KNOWLEDGE_BASE } from '@/lib/knowledge';
import { chunkText } from '@/lib/chunker';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { env } = await getCloudflareContext({ async: true }) as { env: any };
    const chunks = chunkText(KNOWLEDGE_BASE);

    let inserted = 0;
    const batchSize = 20;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const embeddings = await Promise.all(
        batch.map((chunk) => env.AI.run(EMBED_MODEL, { text: [chunk.text] }))
      );

      const vectors = batch.map((chunk, j) => ({
        id: chunk.id,
        values: embeddings[j].data[0],
        metadata: { text: chunk.text },
      }));

      await env.VECTORIZE.upsert(vectors);
      inserted += batch.length;
    }

    return Response.json({ success: true, totalChunks: inserted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Ingest error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
