import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllServiceTags, getServiceTagDetails } from '../../lib/ipService';

type ServiceTagsResponse = {
  serviceTags: string[];
} | {
  error: string;
};

type ServiceTagDetailResponse = {
  serviceTag: string;
  ipRanges: any[];
} | {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServiceTagsResponse | ServiceTagDetailResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { serviceTag } = req.query;

    if (serviceTag && typeof serviceTag === 'string') {
      // Get details for a specific service tag
      const ipRanges = await getServiceTagDetails(serviceTag);
      
      return res.status(200).json({
        serviceTag,
        ipRanges
      });
    } else {
      // Get all service tags
      const serviceTags = await getAllServiceTags();
      
      return res.status(200).json({
        serviceTags
      });
    }
  } catch (error) {
    console.error('Error in service-tags API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}