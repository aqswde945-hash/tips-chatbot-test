import { NextRequest } from 'next/server';


const REPO = 'aqswde945-hash/tips-chatbot-test';
const BRANCH = 'main';

function githubHeaders(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

async function getFileFromGitHub(token: string, filePath: string) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
    { headers: githubHeaders(token), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Failed to fetch ${filePath}`);
  const data = await res.json();
  const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  return { content, sha: data.sha };
}

async function updateFileOnGitHub(token: string, filePath: string, content: unknown, sha: string, message: string) {
  const encoded = Buffer.from(JSON.stringify(content, null, 2) + '\n').toString('base64');
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: githubHeaders(token),
      body: JSON.stringify({ message, content: encoded, sha, branch: BRANCH }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('GitHub update error:', err);
    throw new Error(`GitHub 저장 실패 (${res.status}): ${err.message ?? JSON.stringify(err)}`);
  }
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const fallback = (await import('@/data/site-config.json')).default;
    return Response.json({ config: fallback, faq: [] });
  }
  try {
    const [{ content: config }, { content: faq }] = await Promise.all([
      getFileFromGitHub(token, 'data/site-config.json'),
      getFileFromGitHub(token, 'data/faq.json'),
    ]);
    return Response.json({ config, faq });
  } catch {
    const fallback = (await import('@/data/site-config.json')).default;
    return Response.json({ config: fallback, faq: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, config, faq } = body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 });
  }

  if (config === undefined && faq === undefined) {
    return Response.json({ success: true });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json({ error: 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const updates: Promise<void>[] = [];

    if (config !== undefined) {
      const { sha } = await getFileFromGitHub(token, 'data/site-config.json');
      updates.push(updateFileOnGitHub(token, 'data/site-config.json', config, sha, 'feat: update site config via admin page'));
    }

    if (faq !== undefined) {
      const { sha } = await getFileFromGitHub(token, 'data/faq.json');
      updates.push(updateFileOnGitHub(token, 'data/faq.json', faq, sha, 'feat: update FAQ via admin page'));
    }

    await Promise.all(updates);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin save error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
