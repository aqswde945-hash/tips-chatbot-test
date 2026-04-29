'use client';

import { useState, useEffect } from 'react';

interface Notice {
  id: string;
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

type Tab = 'header' | 'notices' | 'attachments' | 'questions';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [tab, setTab] = useState<Tab>('header');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // 공지 입력
  const [newNotice, setNewNotice] = useState('');
  // 첨부파일 입력
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  useEffect(() => {
    if (authed) {
      fetch('/api/admin')
        .then((r) => r.json())
        .then(setConfig);
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    // 비밀번호 확인은 저장 시 서버에서 하지만, 먼저 config 로드
    setAuthed(true);
    setAuthError('');
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error || '저장 실패');
        if (res.status === 401) {
          setAuthed(false);
          setAuthError('비밀번호가 틀렸습니다.');
        }
      } else {
        setSaveMsg('✅ 저장 완료! Netlify 재배포 중... 1~2분 후 반영됩니다.');
      }
    } catch {
      setSaveMsg('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addNotice = () => {
    if (!newNotice.trim() || !config) return;
    setConfig({
      ...config,
      notices: [...config.notices, { id: Date.now().toString(), content: newNotice.trim() }],
    });
    setNewNotice('');
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

  // 로그인 화면
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
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 로딩
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 바 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">관리자 페이지</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '저장 & 배포'}
          </button>
        </div>
        {saveMsg && (
          <div className="max-w-2xl mx-auto mt-2">
            <p className={`text-sm ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {saveMsg}
            </p>
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 헤더 탭 */}
        {tab === 'header' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-700">헤더 문구 수정</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">제목</label>
              <input
                value={config.header.title}
                onChange={(e) => setConfig({ ...config, header: { ...config.header, title: e.target.value } })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">부제목</label>
              <input
                value={config.header.subtitle}
                onChange={(e) => setConfig({ ...config, header: { ...config.header, subtitle: e.target.value } })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {/* 공지사항 탭 */}
        {tab === 'notices' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">공지사항 추가</h2>
              <div className="flex gap-2">
                <input
                  value={newNotice}
                  onChange={(e) => setNewNotice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNotice()}
                  placeholder="공지 내용 입력..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={addNotice}
                  className="bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>

            {config.notices.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">등록된 공지사항이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {config.notices.map((notice) => (
                  <div key={notice.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
                    <span className="text-yellow-500 mt-0.5">📢</span>
                    <p className="flex-1 text-sm text-gray-700">{notice.content}</p>
                    <button
                      onClick={() => removeNotice(notice.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 첨부파일 탭 */}
        {tab === 'attachments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-700 mb-4">첨부파일 추가</h2>
              <div className="space-y-3">
                <input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="파일명 (예: 사업비 집행기준.pdf)"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <input
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="파일 URL (구글드라이브, 드롭박스 등)"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={addAttachment}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  추가
                </button>
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
                    <button
                      onClick={() => removeAttachment(file.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 예시 질문 탭 */}
        {tab === 'questions' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-700 mb-4">예시 질문 수정</h2>
            {config.exampleQuestions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={() => removeQuestion(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none px-2"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addQuestion}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
            >
              + 질문 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
