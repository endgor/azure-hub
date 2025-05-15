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

  const { ipOrDomain, region, service, page = '1', pageSize = '50' } = req.query
  
  // Parse pagination parameters
  const currentPage = parseInt(Array.isArray(page) ? page[0] : page, 10) || 1
  const itemsPerPage = parseInt(Array.isArray(pageSize) ? pageSize[0] : pageSize, 10) || 50
  
  // Convert array parameters to string if needed
  const ipOrDomainStr = Array.isArray(ipOrDomain) ? ipOrDomain[0] : ipOrDomain
  const regionStr = Array.isArray(region) ? region[0] : region
  const serviceStr = Array.isArray(service) ? service[0] : service
  
  // For simplicity - if only one search parameter is provided and it contains a dot
  // but is not an IP address pattern, check if it's Service.Region format
  if (ipOrDomainStr && !regionStr && !serviceStr && 
      ipOrDomainStr.includes('.') && 
      !/^\d+\.\d+/.test(ipOrDomainStr) &&
      !ipOrDomainStr.includes('/')) {
    
    const parts = ipOrDomainStr.split('.')
    if (parts.length === 2 && 
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[0]) && 
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(parts[1])) {
      
      // This looks like Service.Region format (e.g. Storage.WestEurope)
      // Redirect the request to use both service and region parameters
      return res.redirect(
        307,
        `/api/ipAddress?service=${parts[0]}&region=${parts[1]}&page=${page}&pageSize=${pageSize}`
      )
    }
  }
  
  try {
    // Handle IP/domain lookup with optional filters
    if (ipOrDomainStr) {
      let result
      
      // Check if the input could be a service tag (no service parameter provided)
      if (!serviceStr && /^[a-zA-Z][a-zA-Z0-9]*$/.test(ipOrDomainStr)) {
        // Try as a service tag first
        result = await searchAzureIpAddresses({ service: ipOrDomainStr })
        
        if (result && result.length > 0) {
          // Apply pagination
          const total = result.length
          const startIndex = (currentPage - 1) * itemsPerPage
          const paginatedResults = result.slice(startIndex, startIndex + itemsPerPage)
          
          return res.status(200).json({
            results: paginatedResults,
            query: { service: ipOrDomainStr },
            total,
            page: currentPage,
            pageSize: itemsPerPage
          })
        }
        
        // If no results as service tag, try as region
        result = await searchAzureIpAddresses({ region: ipOrDomainStr })
        
        if (result && result.length > 0) {
          // Apply pagination
          const total = result.length
          const startIndex = (currentPage - 1) * itemsPerPage
          const paginatedResults = result.slice(startIndex, startIndex + itemsPerPage)
          
          return res.status(200).json({
            results: paginatedResults,
            query: { region: ipOrDomainStr },
            total,
            page: currentPage,
            pageSize: itemsPerPage
          })
        }
      }
      
      // As a final option, try IP/domain lookup (which handles CIDR notation too)
      result = await getAzureIpAddressList(ipOrDomainStr)
      
      if (!result) {
        // Try one last search for partial service tag or region name
        const combinedResult = await searchAzureIpAddresses({
          service: ipOrDomainStr,
          region: ipOrDomainStr
        });
        
        if (!combinedResult || combinedResult.length === 0) {
          return res.status(404).json({ error: `No Azure IP range or service found matching "${ipOrDomainStr}"` })
        }
        
        // Apply pagination
        const total = combinedResult.length
        const startIndex = (currentPage - 1) * itemsPerPage
        const paginatedResults = combinedResult.slice(startIndex, startIndex + itemsPerPage)
        
        return res.status(200).json({
          results: paginatedResults,
          query: { ipOrDomain: ipOrDomainStr },
          total,
          page: currentPage,
          pageSize: itemsPerPage
        })
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
      const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage)
      
      return res.status(200).json({
        results: paginatedResults,
        query: { ipOrDomain: ipOrDomainStr, region: regionStr, service: serviceStr },
        total,
        page: currentPage,
        pageSize: itemsPerPage
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
      const paginatedResults = results.slice(startIndex, startIndex + itemsPerPage)
      
      return res.status(200).json({
        results: paginatedResults,
        query: { region: regionStr, service: serviceStr },
        total,
        page: currentPage,
        pageSize: itemsPerPage
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
