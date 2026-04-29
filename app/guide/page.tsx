'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DocItem {
  label: string;
  note?: string;
}

interface SubSection {
  title: string;
  docs: DocItem[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sections: SubSection[];
}

const CATEGORIES: Category[] = [
  {
    id: 'personnel',
    name: '인건비',
    icon: '👤',
    color: 'blue',
    sections: [
      {
        title: '최초 신청 시',
        docs: [
          { label: '4대보험가입확인서' },
          { label: '근로계약서 및 이력서' },
          { label: '근로자 신분증 사본' },
          { label: '근로자 통장 사본' },
        ],
      },
      {
        title: '매월 신청 시',
        docs: [
          { label: '급여대장' },
          { label: '입금확인증 (송금증)' },
        ],
      },
      {
        title: '협약 종료 시',
        docs: [
          { label: '원천징수이행상황신고서' },
          { label: '4대보험료 월별납부확인서' },
          { label: '퇴직연금납입내역서' },
        ],
      },
      {
        title: '건강검진비 청구 시',
        docs: [
          { label: '건강검진 실시확인서' },
          { label: '4대보험가입확인서' },
          { label: '근로계약서 및 이력서' },
        ],
      },
    ],
  },
  {
    id: 'fee',
    name: '지급수수료',
    icon: '💳',
    color: 'purple',
    sections: [
      {
        title: '공통 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '거래처 사업자등록증' },
          { label: '거래처 통장 사본' },
        ],
      },
      {
        title: '항목별 추가 서류',
        docs: [
          { label: '기술이전비', note: '기술이전계약서, 기술이전확인서' },
          { label: '학회·세미나 참가비', note: '참가신청서, 참가확인서, 결과보고서' },
          { label: '전시회·박람회 참가비', note: '참가신청서, 결과보고서, 증빙사진' },
          { label: '시험·인증비', note: '신청서, 시험성적서 또는 인증서' },
          { label: '멘토링비', note: '멘토링계약서, 결과보고서' },
          { label: '기자재 임차비', note: '임대차계약서, 사용확인서' },
          { label: '장비 수리비', note: '수리확인서, 견적서' },
          { label: '사무실 임차료', note: '임대차계약서' },
          { label: '회계감사비', note: '감사보고서' },
          { label: '운반비·보관료', note: '운송장 또는 보관확인서' },
          { label: '법인설립비', note: '법인설립 관련 서류' },
        ],
      },
    ],
  },
  {
    id: 'material',
    name: '재료비',
    icon: '🔩',
    color: 'orange',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '거래명세서' },
          { label: '견적서' },
          { label: '검수조서 (증빙사진 포함)' },
          { label: '거래처 사업자등록증' },
          { label: '거래처 통장 사본' },
        ],
      },
    ],
  },
  {
    id: 'outsourcing',
    name: '외주용역비',
    icon: '🤝',
    color: 'green',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '계약서' },
          { label: '과업지시서' },
          { label: '결과보고서' },
          { label: '검수조서 (증빙사진 포함)' },
          { label: '거래처 사업자등록증' },
          { label: '거래처 통장 사본' },
          { label: '선급금이행보증보험 (필요 시)', note: '선급금 지급 경우에만' },
        ],
      },
    ],
  },
  {
    id: 'equipment',
    name: '기계장치·비품·SW',
    icon: '💻',
    color: 'gray',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '거래명세서' },
          { label: '견적서' },
          { label: '검수조서 (증빙사진 포함)' },
          { label: '거래처 사업자등록증' },
          { label: '거래처 통장 사본' },
        ],
      },
    ],
  },
  {
    id: 'patent',
    name: '특허권 등 무형자산',
    icon: '📜',
    color: 'yellow',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '계약서 (또는 과업내용 포함 견적서)' },
          { label: '출원(등록) 청구서 및 등록증' },
          { label: '관납료 영수증' },
        ],
      },
    ],
  },
  {
    id: 'travel',
    name: '여비',
    icon: '✈️',
    color: 'sky',
    sections: [
      {
        title: '국내 출장',
        docs: [
          { label: '출장신청서' },
          { label: '결과보고서' },
          { label: '교통비 증빙서류 (영수증 등)' },
        ],
      },
      {
        title: '국외 출장',
        docs: [
          { label: '출장계획서' },
          { label: '출장신청서' },
          { label: '결과보고서' },
          { label: '교통비 증빙서류 (항공권 등)' },
        ],
      },
    ],
  },
  {
    id: 'education',
    name: '교육훈련비',
    icon: '📚',
    color: 'teal',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '교육참가 신청서' },
          { label: '교육자료' },
          { label: '신용카드 영수증 (또는 입금증)' },
          { label: '교육이수증 (또는 교육참가확인서)' },
        ],
      },
    ],
  },
  {
    id: 'advertising',
    name: '광고선전비',
    icon: '📣',
    color: 'red',
    sections: [
      {
        title: '필요 서류',
        docs: [
          { label: '세금계산서 (또는 신용카드 영수증)' },
          { label: '거래처 사업자등록증' },
          { label: '거래처 통장 사본' },
          { label: '계약서 (과업내용 포함)' },
          { label: '결과보고서 (결과물)' },
          { label: '검수확인서 (증빙사진 포함)' },
          { label: '홍보제작물' },
        ],
      },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',   text: 'text-blue-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-700' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',  text: 'text-green-700' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-700',   text: 'text-gray-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-700' },
  sky:    { bg: 'bg-sky-50',    border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700',    text: 'text-sky-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700',   text: 'text-teal-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    text: 'text-red-700' },
};

export default function GuidePage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 헤더 */}
      <header className="bg-blue-700 text-white py-5 px-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-blue-200 hover:text-white transition-colors text-sm">
            ← 챗봇으로
          </Link>
          <div className="flex items-center gap-3 ml-2">
            <div className="text-3xl">📋</div>
            <div>
              <h1 className="text-xl font-bold">사업비 증빙서류 가이드북</h1>
              <p className="text-blue-200 text-sm mt-0.5">비목을 클릭하면 필요한 서류를 확인할 수 있습니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          ⚠️ 세부 항목에 따라 추가 서류가 필요할 수 있습니다. 정확한 내용은 담당자에게 확인하세요.
        </div>

        {CATEGORIES.map((cat) => {
          const c = COLOR_MAP[cat.color];
          const isOpen = openId === cat.id;
          const totalDocs = cat.sections.reduce((sum, s) => sum + s.docs.length, 0);

          return (
            <div key={cat.id} className={`rounded-2xl border ${c.border} overflow-hidden shadow-sm`}>
              <button
                onClick={() => toggle(cat.id)}
                className={`w-full flex items-center justify-between px-5 py-4 ${isOpen ? c.bg : 'bg-white'} transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={`font-semibold text-gray-800`}>{cat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>
                    서류 {totalDocs}종
                  </span>
                </div>
                <span className={`text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-gray-400`}>
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className={`${c.bg} border-t ${c.border} px-5 py-4 space-y-4`}>
                  {cat.sections.map((section) => (
                    <div key={section.title}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${c.text} mb-2`}>
                        {section.title}
                      </p>
                      <ul className="space-y-1.5">
                        {section.docs.map((doc, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-0.5 text-gray-400 flex-shrink-0">✓</span>
                            <span>
                              {doc.label}
                              {doc.note && (
                                <span className="text-xs text-gray-400 ml-1">({doc.note})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-center text-xs text-gray-400 py-4">
          팁스(TIPS) 창업사업화 사업비 집행기준 기반 · 중요 사항은 담당자에게 재확인하세요
        </p>
      </main>
    </div>
  );
}
