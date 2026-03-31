import type { NextApiRequest, NextApiResponse } from 'next';

const INDEXNOW_KEY = '869fc665e77e4ca4be074a8685df12a4';
const SITE_URL = 'https://azurehub.org';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.INDEXNOW_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { urls } = req.body as { urls?: string[] };
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  // IndexNow accepts up to 10,000 URLs per request
  const fullUrls = urls.map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`));

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'azurehub.org',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: fullUrls,
      }),
    });

    if (response.ok || response.status === 202) {
      return res.status(200).json({ submitted: fullUrls.length });
    }

    const text = await response.text();
    return res.status(response.status).json({ error: text });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
