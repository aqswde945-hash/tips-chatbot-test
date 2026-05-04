import { KNOWLEDGE_BASE } from '@/lib/knowledge';
import { chunkText } from '@/lib/chunker';

async function upstashUpsert(vectors: Array<{ id: string; data: string; metadata: Record<string, string> }>) {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash 환경변수가 설정되지 않았습니다.');

  const res = await fetch(`${url}/upsert-data`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(vectors),
  });
  if (!res.ok) throw new Error(`Upstash upsert 실패: ${await res.text()}`);
}

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const chunks = chunkText(KNOWLEDGE_BASE);

    let inserted = 0;
    const batchSize = 20;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await upstashUpsert(batch.map((c) => ({ id: c.id, data: c.text, metadata: { text: c.text } })));
      inserted += batch.length;
    }

    return Response.json({ success: true, totalChunks: inserted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Ingest error:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
