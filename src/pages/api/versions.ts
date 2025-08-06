import { NextApiRequest, NextApiResponse } from 'next';
import { getAzureCloudVersions } from '../../lib/ipService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const versions = await getAzureCloudVersions();
    res.status(200).json(versions);
  } catch (error) {
    console.error('Error fetching Azure cloud versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
}