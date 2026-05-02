const REPO = 'aqswde945-hash/tips-chatbot-test';
const BRANCH = 'main';

async function fetchGitHubJson(filePath: string) {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
    { headers, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`GitHub fetch failed: ${filePath}`);
  const data = await res.json();
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
}

export async function GET() {
  try {
    const [config, faq] = await Promise.all([
      fetchGitHubJson('data/site-config.json'),
      fetchGitHubJson('data/faq.json'),
    ]);
    return Response.json({ config, faq });
  } catch {
    const config = (await import('@/data/site-config.json')).default;
    return Response.json({ config, faq: [] });
  }
}
