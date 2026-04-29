import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE } from '@/lib/knowledge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `당신은 팁스(TIPS) 창업사업화 및 해외마케팅 전담 AI 어시스턴트입니다.
아래 제공된 공식 문서(관리기준, 통합관리지침, 시스템 가이드북)를 기반으로 창업기업의 질문에 정확하고 친절하게 답변하세요.

답변 규칙:
1. 반드시 제공된 문서 내용을 근거로 답변하세요.
2. 문서에 없는 내용은 "해당 내용은 문서에서 확인되지 않습니다. 담당자에게 문의해 주세요."라고 안내하세요.
3. 조항이나 기준을 인용할 때는 출처(관리기준/지침 등)를 함께 명시하세요.
4. 답변은 명확하고 이해하기 쉽게 작성하세요.
5. 필요 시 번호 목록이나 단계별 안내를 활용하세요.

=== 참고 문서 ===
${KNOWLEDGE_BASE}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const text = result.response.text();

    return Response.json({ message: text });
  } catch (error) {
    console.error('Gemini API error:', error);
    return Response.json({ error: 'AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
