import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const NO_DOC_RESPONSE = '해당 내용은 제공된 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요.';

const SYSTEM_PROMPT = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.

## 절대 규칙 (반드시 준수)
- 아래 [참고 문서]에 있는 내용만 근거로 답변하세요.
- 문서에 없는 내용은 어떠한 경우에도 답변하지 마세요. 반드시 "해당 내용은 제공된 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고만 답하세요.
- 일반 상식이나 추측으로 보완하지 마세요.
- 답변 마지막에 반드시 [출처] 항목을 작성하세요. [세부관리기준]과 [통합관리지침] 모두 검토하고, 해당되는 조항을 각각 명시하세요. 해당 문서에 관련 내용이 없으면 "해당 없음"으로 표기하세요.

## 사용자 전제
- 팁스(TIPS) 사업에 선정된 창업기업 소속 임직원입니다.
- 답변은 핵심만 간결하게 작성하세요. 불필요한 반복이나 서론은 생략하세요.
- 총 답변 길이는 500자 이내를 목표로 하세요.

## 답변 형식
1. 번호 목록, 단계별 안내 등 마크다운 형식을 적극 활용하세요.
2. PMS·시스템 접속 관련 질문: "① https://www.k-startup.go.kr/ 접속 ② 상단 메뉴 '사업신청관리' 클릭 ③ 로그인 후 이용 / 기술적 문제: 1357 콜센터"
3. 시스템 오류·접속 장애: 1357 콜센터 안내
4. 답변 마지막은 항상 아래 형식으로 마무리하세요:

---
**[출처]**
- 세부관리기준: (해당 조항 또는 "해당 없음")
- 통합관리지침: (해당 조항 또는 "해당 없음")`;

const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY 없음');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq 오류 (${res.status}): ${errText}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Groq 빈 응답');
  return content;
}

function normalizeQuery(text: string): string {
  return text
    .replace(/어케/g, '어떻게')
    .replace(/왜케/g, '왜이렇게')
    .replace(/이케/g, '이렇게')
    .replace(/그케/g, '그렇게')
    .replace(/뭔데/g, '무엇인가')
    .replace(/뭐야/g, '무엇인가')
    .replace(/뭐냐/g, '무엇인가')
    .replace(/뭐임/g, '무엇인가')
    .replace(/뭔지/g, '무엇인지')
    .replace(/뭔가/g, '무엇인가')
    .replace(/얼마야/g, '얼마인가')
    .replace(/얼마임/g, '얼마인가')
    .replace(/되나요\?|되나요/g, '가능한가요')
    .replace(/안돼/g, '안됩니다')
    .replace(/안됨/g, '안됩니다')
    .replace(/됨/g, '됩니다')
    .replace(/해줘/g, '해주세요')
    .replace(/알려줘/g, '알려주세요')
    .replace(/보여줘/g, '보여주세요');
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { env } = await getCloudflareContext({ async: true }) as { env: any };

    const latestUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? '';
    const normalizedMsg = normalizeQuery(latestUserMsg);
    const cacheKey = normalizedMsg.trim().toLowerCase().slice(0, 512);

    // KV 캐시 확인
    const cached = await env.CHAT_CACHE.get(cacheKey);
    if (cached) {
      return Response.json({ message: cached });
    }

    // Upstash로 관련 문서 검색 (정규화된 쿼리 사용)
    const upstashUrl = process.env.UPSTASH_VECTOR_REST_URL;
    const upstashToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
    if (!upstashUrl || !upstashToken) throw new Error('Upstash 환경변수가 설정되지 않았습니다.');

    const searchRes = await fetch(`${upstashUrl}/query-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: normalizedMsg, topK: 10, includeMetadata: true }),
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

    let message = '';
    try {
      const result = await env.AI.run(MODEL, { messages: cfMessages, max_tokens: 2048 }) as { response?: string; error?: unknown };
      const resultErr = String(result.error ?? '');
      if (result.error || !result.response) {
        if (resultErr.includes('neurons') || resultErr.includes('4006') || !result.response) {
          message = await callGroq(cfMessages);
        } else {
          throw new Error(resultErr || 'Workers AI 빈 응답');
        }
      } else {
        message = result.response;
      }
    } catch (aiError) {
      const aiMsg = aiError instanceof Error ? aiError.message : String(aiError);
      if (aiMsg.includes('neurons') || aiMsg.includes('4006')) {
        message = await callGroq(cfMessages);
      } else {
        throw aiError;
      }
    }

    await env.CHAT_CACHE.put(cacheKey, message, { expirationTtl: 86400 });
    return Response.json({ message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI error:', msg);
    return Response.json({ error: `오류: ${msg}` }, { status: 500 });
  }
}
