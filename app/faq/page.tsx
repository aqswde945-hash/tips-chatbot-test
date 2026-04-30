'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(({ faq }) => setFaq(faq ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-blue-700 text-white py-5 px-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-blue-200 hover:text-white transition-colors text-sm">
            ← 챗봇으로
          </Link>
          <div className="flex items-center gap-3 ml-2">
            <div className="text-3xl">💡</div>
            <div>
              <h1 className="text-xl font-bold">자주 묻는 질문</h1>
              <p className="text-blue-200 text-sm mt-0.5">팁스 창업기업 사업비 집행 FAQ</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-12">불러오는 중...</p>
        )}

        {!loading && faq.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">등록된 FAQ가 없습니다.</p>
            <Link href="/" className="mt-4 inline-block text-blue-600 text-sm hover:underline">
              챗봇에서 직접 질문하기
            </Link>
          </div>
        )}

        {faq.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
              <button
                onClick={() => toggle(item.id)}
                className={`w-full flex items-center justify-between px-5 py-4 text-left ${isOpen ? 'bg-blue-50' : 'bg-white'} transition-colors`}
              >
                <span className="font-medium text-gray-800 text-sm pr-4">Q. {item.question}</span>
                <span className={`text-lg transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''} text-gray-400`}>
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="bg-blue-50 border-t border-blue-100 px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {!loading && faq.length > 0 && (
          <div className="text-center pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              🤖 더 궁금한 건 AI에게 물어보기
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 py-4">
          팁스(TIPS) 창업기업 사업비 집행기준 기반 · 중요 사항은 담당자에게 재확인하세요
        </p>
      </main>
    </div>
  );
}
