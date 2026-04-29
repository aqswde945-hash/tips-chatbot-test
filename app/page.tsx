'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import siteConfig from '@/data/site-config.json';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        setMessages([...newMessages, { role: 'assistant', content: '오류가 발생했습니다.' }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content: accumulated }]);
      }
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* 헤더 */}
      <header className="bg-blue-700 text-white py-5 px-4 shadow-md">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🤖</div>
            <div>
              <h1 className="text-xl font-bold">{siteConfig.header.title}</h1>
              <p className="text-blue-200 text-sm mt-0.5">{siteConfig.header.subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 공지사항 */}
      {siteConfig.notices.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-3xl mx-auto space-y-1">
            {(siteConfig.notices as Array<{ id: string; title: string; content: string }>).map((notice) => (
              <div key={notice.id} className="flex items-start gap-2 text-sm text-yellow-800">
                <span className="font-bold flex-shrink-0">📢</span>
                <div>
                  <span className="font-semibold">{notice.title}</span>
                  <span className="text-yellow-700 ml-2">{notice.content}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 첨부파일 */}
      {siteConfig.attachments.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-500 mb-2 font-medium">📎 참고 자료</p>
            <div className="flex flex-wrap gap-2">
              {(siteConfig.attachments as Array<{ id: string; name: string; url: string }>).map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  📄 {file.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 채팅 영역 */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-4">

        {/* 초기 안내 */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">무엇이든 질문하세요</h2>
            <p className="text-gray-500 text-sm mb-6">
              팁스 창업사업화·해외마케팅 사업비 집행, 협약변경, 시스템 이용 등<br />
              공식 문서 기반으로 정확하게 안내해드립니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
              {siteConfig.exampleQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm mr-2 mt-1 flex-shrink-0">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                      hr: () => <hr className="my-3 border-gray-200" />,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-blue-300 pl-3 text-gray-600 my-2">{children}</blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="text-xs border-collapse border border-gray-200 w-full">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 font-semibold">{children}</th>,
                      td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <div className="flex gap-1 items-center py-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </main>

      {/* 입력창 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="질문을 입력하세요..."
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            전송
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          공식 문서 기반 AI 답변 · 중요 사항은 담당자에게 재확인하세요
        </p>
      </div>
    </div>
  );
}
