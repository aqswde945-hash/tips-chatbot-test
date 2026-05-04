import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const SYSTEM_PROMPT_BASE = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.
아래 제공된 참고 문서를 기반으로 정확하고 친절하게 답변하세요.

## 사용자 전제
- 이 챗봇을 사용하는 사용자는 **팁스(TIPS) 사업에 선정된 창업기업 소속 임직원**입니다.
- 따라서 주관기관·운영사 전용 규정(주관기관 인건비, 창업프로그램 운영비, 일반수용비 등)은 이 챗봇의 답변 범위에 포함되지 않습니다.

## 답변 규칙
1. 반드시 제공된 문서 내용을 근거로 답변하세요.
2. 문서에 없는 내용은 "해당 내용은 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고 안내하세요.
3. 모든 답변은 관리기준과 통합관리지침 두 문서의 조항을 모두 명시하고, 문서의 내용이 상충하거나 추가 요건이 있는 경우, "※ 두 기준을 모두 충족해야 합니다." 안내
4. 답변은 명확하고 이해하기 쉽게 작성하세요.
5. 번호 목록, 단계별 안내, 표 등 마크다운 형식을 적극 활용하여 가독성을 높이세요.
6. PMS, 창업사업통합정보관리시스템, 시스템 접속 관련 질문:
   "① https://www.k-startup.go.kr/ 접속 ② 상단 메뉴 '사업신청관리' 클릭 ③ 로그인 후 이용 / 기술적 문제: 1357 콜센터"
7. 시스템 오류·접속 장애는 1357 콜센터로 안내하세요.`;

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

    // Upstash로 관련 문서 검색 (임베딩은 Upstash 내부 처리)
    const upstashUrl = process.env.UPSTASH_VECTOR_REST_URL;
    const upstashToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
    if (!upstashUrl || !upstashToken) throw new Error('Upstash 환경변수가 설정되지 않았습니다.');

    const searchRes = await fetch(`${upstashUrl}/query-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: latestUserMsg, topK: 10, includeMetadata: true }),
    });
    const searchData = await searchRes.json() as { result: Array<{ metadata?: { text?: string } }> };

    const context = searchData.result
      .map((m) => m.metadata?.text ?? '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    const systemPrompt = context
      ? `${SYSTEM_PROMPT_BASE}\n\n=== 참고 문서 (관련 내용 발췌) ===\n${context}`
      : `${SYSTEM_PROMPT_BASE}\n\n관련 문서를 찾지 못했습니다. 일반적인 지식으로 답변하되, 불확실한 경우 담당자에게 확인을 권장하세요.`;

    const cfMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    const result = await env.AI.run(MODEL, { messages: cfMessages, max_tokens: 2048 }) as { response?: string };
    const message = result.response ?? '';

    // 응답 캐시 저장 (24시간)
    await env.CHAT_CACHE.put(cacheKey, message, { expirationTtl: 86400 });

    return Response.json({ message });
  } catch (error) {
    console.error('AI error:', error);
    return Response.json({ error: 'AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
