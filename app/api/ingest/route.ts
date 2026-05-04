import { KNOWLEDGE_BASE } from '@/lib/knowledge';
import { chunkText } from '@/lib/chunker';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const EMBED_MODEL = '@cf/baai/bge-m3';

async function upstashUpsert(vectors: Array<{ id: string; vector: number[]; metadata: Record<string, string> }>) {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash 환경변수가 설정되지 않았습니다.');

  const res = await fetch(`${url}/upsert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ vectors }),
  });
  if (!res.ok) throw new Error(`Upstash upsert 실패: ${await res.text()}`);
}

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
    const embedBatchSize = 20;
    const upsertBatchSize = 5;

    for (let i = 0; i < chunks.length; i += embedBatchSize) {
      const batch = chunks.slice(i, i + embedBatchSize);
      const result = await env.AI.run(EMBED_MODEL, { text: batch.map((c) => c.text) });

      const vectors = batch.map((chunk, j) => ({
        id: chunk.id,
        vector: result.data[j],
        metadata: { text: chunk.text },
      }));

      for (let j = 0; j < vectors.length; j += upsertBatchSize) {
        await upstashUpsert(vectors.slice(j, j + upsertBatchSize));
      }
      inserted += batch.length;
    }

    return Response.json({ success: true, totalChunks: inserted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Ingest error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
