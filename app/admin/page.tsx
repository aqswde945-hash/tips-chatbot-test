'use client';

import { useState, useEffect } from 'react';

interface Notice {
  id: string;
  title: string;
  content: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
}

interface SiteConfig {
  header: {
    title: string;
    subtitle: string;
  };
  notices: Notice[];
  attachments: Attachment[];
  exampleQuestions: string[];
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

type Tab = 'header' | 'notices' | 'attachments' | 'questions' | 'faq';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [tab, setTab] = useState<Tab>('header');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState('');

  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  useEffect(() => {
    if (authed) {
      fetch('/api/admin')
        .then((r) => r.json())
        .then(({ config, faq }) => {
          setConfig(config);
          setFaq(faq ?? []);
        });
    }
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setAuthError('비밀번호가 틀렸습니다.');
      } else {
        setAuthed(true);
        setAuthError('');
      }
    } catch {
      setAuthError('네트워크 오류가 발생했습니다.');
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestMsg('');
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIngestMsg(data.error || '지식베이스 구축 실패');
      } else {
        setIngestMsg(`✅ 완료! 총 ${data.totalChunks}개 청크가 저장되었습니다.`);
      }
    } catch {
      setIngestMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setIngesting(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const body: { password: string; config?: SiteConfig; faq?: FaqItem[] } = { password };
      if (tab === 'faq') {
        body.faq = faq;
      } else {
        body.config = config;
      }
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error || '저장 실패');
        if (res.status === 401) {
          setAuthed(false);
          setAuthError('비밀번호가 틀렸습니다.');
        }
      } else {
        setSaveMsg('✅ 저장 완료! 즉시 반영됩니다.');
      }
    } catch {
      setSaveMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addNotice = () => {
    if (!newNoticeTitle.trim() || !newNoticeContent.trim() || !config) return;
    setConfig({
      ...config,
      notices: [...config.notices, { id: Date.now().toString(), title: newNoticeTitle.trim(), content: newNoticeContent.trim() }],
    });
    setNewNoticeTitle('');
    setNewNoticeContent('');
  };

  const removeNotice = (id: string) => {
    if (!config) return;
    setConfig({ ...config, notices: config.notices.filter((n) => n.id !== id) });
  };

  const addAttachment = () => {
    if (!newFileName.trim() || !newFileUrl.trim() || !config) return;
    setConfig({
      ...config,
      attachments: [
        ...config.attachments,
        { id: Date.now().toString(), name: newFileName.trim(), url: newFileUrl.trim() },
      ],
    });
    setNewFileName('');
    setNewFileUrl('');
  };

  const removeAttachment = (id: string) => {
    if (!config) return;
    setConfig({ ...config, attachments: config.attachments.filter((a) => a.id !== id) });
  };

  const updateQuestion = (i: number, value: string) => {
    if (!config) return;
    const updated = [...config.exampleQuestions];
    updated[i] = value;
    setConfig({ ...config, exampleQuestions: updated });
  };

  const removeQuestion = (i: number) => {
    if (!config) return;
    const updated = config.exampleQuestions.filter((_, idx) => idx !== i);
    setConfig({ ...config, exampleQuestions: updated });
  };

  const addQuestion = () => {
    if (!config) return;
    setConfig({ ...config, exampleQuestions: [...config.exampleQuestions, ''] });
  };

  const addFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setFaq([...faq, { id: Date.now().toString(), question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const removeFaq = (id: string) => setFaq(faq.filter((f) => f.id !== id));
  const updateFaqQuestion = (id: string, value: string) => setFaq(faq.map((f) => f.id === id ? { ...f, question: value } : f));
  const updateFaqAnswer = (id: string, value: string) => setFaq(faq.map((f) => f.id === id ? { ...f, answer: value } : f));

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-1">관리자 로그인</h1>
          <p className="text-sm text-gray-500 mb-6">팁스 챗봇 관리자 페이지</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">불러오는 중...</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'header', label: '헤더' },
    { key: 'notices', label: `공지사항 (${config.notices.length})` },
    { key: 'attachments', label: `첨부파일 (${config.attachments.length})` },
    { key: 'questions', label: '예시 질문' },
    { key: 'faq', label: `FAQ (${faq.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-gray-800">관리자 페이지</h1>
          <div className="flex gap-2">
            <button
              onClick={handleIngest}
              disabled={ingesting}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {ingesting ? '구축 중...' : 'AI 지식베이스 재구축'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        {saveMsg && (
          <div className="max-w-2xl mx-auto mt-2">
            <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{saveMsg}</p>
          </div>
        )}
        {ingestMsg && (
          <div className="max-w-2xl mx-auto mt-1">
            <p className={`text-sm ${ingestMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{ingestMsg}</p>
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'header' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">헤더 문구 수정</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">제목</label>
              <input value={config.header.title} onChange={(e) => setConfig({ ...config, header: { ...config.header, title: e.target.value } })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">부제목</label>
              <input value={config.header.subtitle} onChange={(e) => setConfig({ ...config, header: { ...config.header, subtitle: e.target.value } })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        )}

        {tab === 'notices' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">공지사항 추가</h2>
              <div className="space-y-3">
                <input value={newNoticeTitle} onChange={(e) => setNewNoticeTitle(e.target.value)} placeholder="공지 제목" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <textarea value={newNoticeContent} onChange={(e) => setNewNoticeContent(e.target.value)} placeholder="공지 내용 입력..." rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
                <button onClick={addNotice} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">추가</button>
              </div>
            </div>
            {config.notices.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">등록된 공지사항이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {config.notices.map((notice) => (
                  <div key={notice.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
                    <span className="text-yellow-500 mt-0.5">📢</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{notice.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{notice.content}</p>
                    </div>
                    <button onClick={() => removeNotice(notice.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'attachments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">첨부파일 추가</h2>
              <div className="space-y-3">
                <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="파일명" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <input value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} placeholder="파일 URL" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <button onClick={addAttachment} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">추가</button>
              </div>
            </div>
            {config.attachments.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">등록된 첨부파일이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {config.attachments.map((file) => (
                  <div key={file.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                    <span>📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400 truncate">{file.url}</p>
                    </div>
                    <button onClick={() => removeAttachment(file.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'questions' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-700 mb-4">예시 질문 수정</h2>
            {config.exampleQuestions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input value={q} onChange={(e) => updateQuestion(i, e.target.value)} className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <button onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none px-2">×</button>
              </div>
            ))}
            <button onClick={addQuestion} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">+ 질문 추가</button>
          </div>
        )}

        {tab === 'faq' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">FAQ 추가</h2>
              <div className="space-y-3">
                <input value={newFaqQuestion} onChange={(e) => setNewFaqQuestion(e.target.value)} placeholder="질문 (예: 인건비 지급 시 필요한 서류는?)" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <textarea value={newFaqAnswer} onChange={(e) => setNewFaqAnswer(e.target.value)} placeholder="답변 내용 입력..." rows={4} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
                <button onClick={addFaq} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">추가</button>
              </div>
            </div>
            {faq.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">등록된 FAQ가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {faq.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold text-sm flex-shrink-0 mt-2.5">Q.</span>
                      <input value={item.question} onChange={(e) => updateFaqQuestion(item.id, e.target.value)} className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      <button onClick={() => removeFaq(item.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none mt-1.5 flex-shrink-0">×</button>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 font-bold text-sm flex-shrink-0 mt-2.5">A.</span>
                      <textarea value={item.answer} onChange={(e) => updateFaqAnswer(item.id, e.target.value)} rows={3} className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
