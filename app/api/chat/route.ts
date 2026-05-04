import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const NO_DOC_RESPONSE = '해당 내용은 제공된 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요.';

const SYSTEM_PROMPT = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.

## 절대 규칙 (반드시 준수)
- 아래 [참고 문서]에 있는 내용만 근거로 답변하세요.
- 문서에 없는 내용은 어떠한 경우에도 답변하지 마세요. 반드시 "해당 내용은 제공된 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고만 답하세요.
- 일반 상식이나 추측으로 보완하지 마세요.

## 사용자 전제
- 팁스(TIPS) 사업에 선정된 창업기업 소속 임직원입니다.

## 답변 형식
1. 출처 조항을 명시하세요.
2. 번호 목록, 단계별 안내, 표 등 마크다운 형식을 적극 활용하세요.
3. PMS·시스템 접속 관련 질문: "① https://www.k-startup.go.kr/ 접속 ② 상단 메뉴 '사업신청관리' 클릭 ③ 로그인 후 이용 / 기술적 문제: 1357 콜센터"
4. 시스템 오류·접속 장애: 1357 콜센터 안내`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { env } = await getCloudflareContext({ async: true }) as { env: any };

    const latestUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? '';
    const cacheKey = latestUserMsg.trim().toLowerCase().slice(0, 512);

    // KV 캐시 확인
    const cached = await env.CHAT_CACHE.get(cacheKey);
    if (cached) {
      return Response.json({ message: cached });
    }

    // Upstash로 관련 문서 검색
    const upstashUrl = process.env.UPSTASH_VECTOR_REST_URL;
    const upstashToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
    if (!upstashUrl || !upstashToken) throw new Error('Upstash 환경변수가 설정되지 않았습니다.');

    const searchRes = await fetch(`${upstashUrl}/query-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: latestUserMsg, topK: 10, includeMetadata: true }),
    });
    const searchData = await searchRes.json() as { result?: Array<{ metadata?: { text?: string } }> };

    const context = (searchData.result ?? [])
      .map((m) => m.metadata?.text ?? '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    // 관련 문서 없으면 바로 거절
    if (!context) {
      await env.CHAT_CACHE.put(cacheKey, NO_DOC_RESPONSE, { expirationTtl: 86400 });
      return Response.json({ message: NO_DOC_RESPONSE });
    }

    const cfMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `[참고 문서]\n\n${context}` },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    const result = await env.AI.run(MODEL, { messages: cfMessages, max_tokens: 2048 }) as { response?: string };
    const message = result.response ?? '';

    await env.CHAT_CACHE.put(cacheKey, message, { expirationTtl: 86400 });
    return Response.json({ message });
  } catch (error) {
    console.error('AI error:', error);
    return Response.json({ error: 'AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
