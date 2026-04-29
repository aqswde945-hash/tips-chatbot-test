import { NextRequest } from 'next/server';
import currentConfig from '@/data/site-config.json';

const REPO = 'aqswde945-hash/tips-chatbot';
const FILE_PATH = 'data/site-config.json';
const BRANCH = 'main';

export async function GET() {
  return Response.json(currentConfig);
}

export async function POST(req: NextRequest) {
  const { password, config } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json({ error: 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // 현재 파일 SHA 조회
  const getRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers }
  );

  if (!getRes.ok) {
    return Response.json({ error: 'GitHub에서 파일을 읽을 수 없습니다.' }, { status: 500 });
  }

  const fileData = await getRes.json();

  // 파일 업데이트
  const content = Buffer.from(JSON.stringify(config, null, 2) + '\n').toString('base64');

  const updateRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'feat: update site config via admin page',
        content,
        sha: fileData.sha,
        branch: BRANCH,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    console.error('GitHub update error:', err);
    return Response.json({ error: 'GitHub 저장에 실패했습니다.' }, { status: 500 });
  }

  return Response.json({ success: true });
}
