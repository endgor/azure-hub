import type { NextApiRequest, NextApiResponse } from 'next'
import { getAzureIpAddressList, searchAzureIpAddresses } from '../../lib/ipService'
import { AzureIpAddress } from '../../types/azure'

type ResponseData = {
  results: AzureIpAddress[];
  query: {
    ipOrDomain?: string;
    region?: string;
    service?: string;
  };
  total: number;
  page?: number;
  pageSize?: number;
} | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Add caching headers for better performance
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  const { ipOrDomain, region, service, page = '1', pageSize = '50' } = req.query

  // Parse pagination parameters, supporting "all" to return all results
  const currentPage = parseInt(Array.isArray(page) ? page[0] : page, 10) || 1
  const rawPageSize = Array.isArray(pageSize) ? pageSize[0] : pageSize
  const showAll = rawPageSize === 'all'
  
  // Validate page size - only allow specific values or default to 50
  let itemsPerPage = 50;
  if (showAll) {
    itemsPerPage = Infinity;
  } else if (rawPageSize) {
    const parsedPageSize = parseInt(rawPageSize, 10);
    if (!isNaN(parsedPageSize) && [10, 20, 50, 100, 200].includes(parsedPageSize)) {
      itemsPerPage = parsedPageSize;
    }
  }
  
  // Convert array parameters to string if needed
  const ipOrDomainStr = Array.isArray(ipOrDomain) ? ipOrDomain[0] : ipOrDomain
  const regionStr = Array.isArray(region) ? region[0] : region
  const serviceStr = Array.isArray(service) ? service[0] : service
  
  // Handle Service.Region format more efficiently without redirect
  if (ipOrDomainStr && !regionStr && !serviceStr && 
      ipOrDomainStr.includes('.') && 
      !/^\d+\.\d+/.test(ipOrDomainStr) &&
      !ipOrDomainStr.includes('/')) {
    
    const parts = ipOrDomainStr.split('.')
    if (parts.length === 2 && 
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[0]) && 
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[1])) {
      
      // Parse as Service.Region format directly
      const serviceParam = parts[0];
      const regionParam = parts[1];
      
      try {
        const results = await searchAzureIpAddresses({
          service: serviceParam,
          region: regionParam
        });
        
        if (results && results.length > 0) {
          const total = results.length;
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedResults = showAll
            ? results
            : results.slice(startIndex, startIndex + itemsPerPage);

          return res.status(200).json({
            results: paginatedResults,
            query: { service: serviceParam, region: regionParam },
            total,
            page: showAll ? 1 : currentPage,
            pageSize: showAll ? total : itemsPerPage
          });
        }
      } catch (error) {
        console.error('Error processing Service.Region format:', error);
        // Fall through to handle as domain
      }
    }
  }
  
  try {
    // Handle IP/domain lookup with optional filters
    if (ipOrDomainStr) {
      let result
      
      // Optimize single term lookup - try service first, then region if no results
      if (!serviceStr && /^[a-zA-Z][a-zA-Z0-9]*$/.test(ipOrDomainStr)) {
        try {
          // Try service search first (more common)
          const serviceResult = await searchAzureIpAddresses({ service: ipOrDomainStr });
          
          if (serviceResult && serviceResult.length > 0) {
            const total = serviceResult.length;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedResults = showAll
              ? serviceResult
              : serviceResult.slice(startIndex, startIndex + itemsPerPage);

            return res.status(200).json({
              results: paginatedResults,
              query: { service: ipOrDomainStr },
              total,
              page: showAll ? 1 : currentPage,
              pageSize: showAll ? total : itemsPerPage
            });
          }
          
          // If no service results, try region
          const regionResult = await searchAzureIpAddresses({ region: ipOrDomainStr });
          
          if (regionResult && regionResult.length > 0) {
            const total = regionResult.length;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedResults = showAll
              ? regionResult
              : regionResult.slice(startIndex, startIndex + itemsPerPage);

            return res.status(200).json({
              results: paginatedResults,
              query: { region: ipOrDomainStr },
              total,
              page: showAll ? 1 : currentPage,
              pageSize: showAll ? total : itemsPerPage
            });
          }
        } catch (error) {
          console.error('Error in sequential service/region search:', error);
          // Fall through to IP lookup
        }
      }
      
      // As a final option, try IP/domain lookup (which handles CIDR notation too)
      result = await getAzureIpAddressList(ipOrDomainStr)
      
      if (!result) {
        return res.status(404).json({ error: `No Azure IP range or service found matching "${ipOrDomainStr}"` })
      }
      
      // Filter by region and service if specified
      let filteredResults = result
      
      if (regionStr) {
        filteredResults = filteredResults.filter(item => 
          item.region && item.region.toLowerCase().includes(regionStr.toLowerCase())
        )
      }
      
      if (serviceStr) {
        filteredResults = filteredResults.filter(item =>
          item.systemService && item.systemService.toLowerCase().includes(serviceStr.toLowerCase()) ||
          item.serviceTagId.toLowerCase().includes(serviceStr.toLowerCase())
        )
      }
      
      // Apply pagination
      const total = filteredResults.length
      const startIndex = (currentPage - 1) * itemsPerPage
      const paginatedResults = showAll
        ? filteredResults
        : filteredResults.slice(startIndex, startIndex + itemsPerPage)

      return res.status(200).json({
        results: paginatedResults,
        query: { ipOrDomain: ipOrDomainStr, region: regionStr, service: serviceStr },
        total,
        page: showAll ? 1 : currentPage,
        pageSize: showAll ? total : itemsPerPage
      })
    } 
    // If we have region or service, use the search functionality directly
    else if (regionStr || serviceStr) {
      const results = await searchAzureIpAddresses({
        region: regionStr,
        service: serviceStr
      })
      
      if (!results || results.length === 0) {
        return res.status(404).json({ error: `No Azure IP ranges found matching your search criteria` })
      }
      
      // Apply pagination
      const total = results.length
      const startIndex = (currentPage - 1) * itemsPerPage
      const paginatedResults = showAll
        ? results
        : results.slice(startIndex, startIndex + itemsPerPage)

      return res.status(200).json({
        results: paginatedResults,
        query: { region: regionStr, service: serviceStr },
        total,
        page: showAll ? 1 : currentPage,
        pageSize: showAll ? total : itemsPerPage
      })
    } 
    // No valid search parameters
    else {
      return res.status(400).json({ error: "Please enter an IP address, CIDR, service name, or region" })
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return res.status(500).json({ error: "Failed to process the request" })
  }
}
