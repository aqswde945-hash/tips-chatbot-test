import { GoogleGenAI } from '@google/genai';
import { KNOWLEDGE_BASE } from '@/lib/knowledge';

const API_KEYS = [
  process.env.GEMINI_API_KEY!,
  process.env.GEMINI_API_KEY_2!,
  process.env.GEMINI_API_KEY_3!,
].filter(Boolean);

const SYSTEM_PROMPT = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.
아래 제공된 공식 문서(관리기준, 통합관리지침, 시스템 가이드북)를 기반으로 창업기업의 질문에 정확하고 친절하게 답변하세요.

답변 규칙:
1. 반드시 제공된 문서 내용을 근거로 답변하세요.
2. 문서에 없는 내용은 "해당 내용은 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고 안내하세요.
3. 모든 답변은 반드시 아래 형식으로 두 문서를 모두 명시하세요:
   - [관리기준] 해당 조항/내용을 구체적으로 인용
   - [통합관리지침] 해당 조항/내용을 구체적으로 인용
   - 두 문서의 내용이 상충하거나 추가 요건이 있는 경우, "※ 두 기준을 모두 충족해야 합니다. [상충 또는 추가 내용 설명]"을 반드시 안내하세요.
4. 두 문서 중 한쪽에만 관련 내용이 있는 경우에도, 나머지 문서에 해당 내용이 없음을 명시하세요.
5. 답변은 명확하고 이해하기 쉽게 작성하세요.
6. 필요 시 번호 목록이나 단계별 안내를 활용하세요.
7. PMS, 창업사업통합정보관리시스템, 시스템 접속, 시스템 링크 관련 질문을 받으면 반드시 아래와 같이 안내하세요:
   "창업사업통합정보관리시스템은 아래 순서로 접속하실 수 있습니다.
   ① K-START.GO.KR 접속
   ② 상단 메뉴에서 '창업사업통합정보관리시스템' 클릭 또는 바로가기 선택
   ③ 회원가입 및 로그인 후 이용 가능합니다."

=== 참고 문서 ===
${KNOWLEDGE_BASE}`;

async function tryWithKeys(messages: { role: string; content: string }[]) {
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1].content;

  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEYS[i] });
      const chat = ai.chats.create({
        model: 'gemini-flash-latest',
        config: { systemInstruction: SYSTEM_PROMPT },
        history,
      });
      const result = await chat.sendMessage({ message: lastMessage });
      return result.text;
    } catch (error: unknown) {
      const isQuotaError =
        error instanceof Error &&
        (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'));

      // 마지막 키까지 실패하거나 쿼터 초과가 아닌 오류면 바로 throw
      if (!isQuotaError || i === API_KEYS.length - 1) throw error;

      console.log(`API 키 ${i + 1} 한도 초과 → 키 ${i + 2}로 전환`);
    }
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const text = await tryWithKeys(messages);
    return Response.json({ message: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return Response.json({ error: 'AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
