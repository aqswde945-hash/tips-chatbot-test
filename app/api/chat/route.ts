import { KNOWLEDGE_BASE } from '@/lib/knowledge';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const SYSTEM_PROMPT = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.
아래 제공된 공식 문서(관리기준, 통합관리지침, 시스템 가이드북)를 기반으로 정확하고 친절하게 답변하세요.

## 사용자 전제
- 이 챗봇을 사용하는 모든 사용자는 **팁스(TIPS) 사업에 선정된 주관기관 소속 임직원**입니다.
- 따라서 모든 답변은 주관기관의 입장과 권리·의무를 기준으로 작성하세요.

## 답변 규칙
1. 반드시 제공된 문서 내용을 근거로 답변하세요.
2. 문서에 없는 내용은 "해당 내용은 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고 안내하세요.
3. 모든 답변은 반드시 아래 형식으로 두 문서를 모두 명시하세요:
   - **[관리기준]** 해당 조항/내용을 구체적으로 인용
   - **[통합관리지침]** 해당 조항/내용을 구체적으로 인용
   - 두 문서의 내용이 상충하거나 추가 요건이 있는 경우, "※ 두 기준을 모두 충족해야 합니다. [상충 또는 추가 내용 설명]"을 반드시 안내하세요.
4. 두 문서 중 한쪽에만 관련 내용이 있는 경우에도, 나머지 문서에 해당 내용이 없음을 명시하세요.
5. 답변은 명확하고 이해하기 쉽게 작성하세요.
6. 번호 목록, 단계별 안내, 표 등 마크다운 형식을 적극 활용하여 가독성을 높이세요.
7. PMS, 창업사업통합정보관리시스템, 시스템 접속, 시스템 링크 관련 질문을 받으면 반드시 아래와 같이 안내하세요:
   "창업사업통합정보관리시스템은 아래 순서로 접속하실 수 있습니다.
   ① https://www.k-startup.go.kr/ 접속
   ② 상단 메뉴에서 '사업신청관리' 클릭
   ③ 회원가입 및 로그인 후 이용 가능합니다.
   시스템 이용 중 발생하는 기술적 문제나 접속 관련 문의는 국번 없이 1357(중소기업 통합콜센터)로 연락하여 안내받으실 수 있습니다."
8. 시스템 오류, 접속 장애 등 기술적 문제는 주관기관(한국벤처캐피탈협회)이 아닌 1357 콜센터로 안내하세요. 주관기관은 시스템 관리가 아닌 사업 관리를 담당합니다.

=== 참고 문서 ===
${KNOWLEDGE_BASE}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const cfMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { env } = await getCloudflareContext({ async: true }) as { env: any };
    const result = await env.AI.run(MODEL, { messages: cfMessages }) as { response?: string };

    return Response.json({ message: result.response ?? '' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI error:', msg);
    return Response.json({ error: `[DEBUG] ${msg}` }, { status: 500 });
  }
}
