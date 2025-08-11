import { NextApiRequest, NextApiResponse } from 'next';
import { getFileMetadata } from '../../lib/ipService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add aggressive caching since file metadata changes infrequently
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200'); // 24h cache, 12h stale
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const metadata = await getFileMetadata();
    res.status(200).json(metadata);
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    res.status(500).json({ error: 'Failed to fetch file metadata' });
  }
}