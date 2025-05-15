import Layout from '@/components/Layout';
import Link from 'next/link';

export default function About() {
  return (
    <Layout title="About - Azure IP Lookup">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-4xl font-bold mb-3 text-blue-800">About Azure IP Lookup</h1>
          <p className="text-xl text-gray-600">
            A comprehensive tool for identifying Microsoft Azure infrastructure
          </p>
        </div>
        
        <div className="prose prose-blue max-w-none">
          <p className="lead">
            Azure IP Lookup is an open-source tool deployed on Vercel that helps you determine if an IP address 
            or domain belongs to Microsoft Azure infrastructure. This can be useful for various scenarios 
            in network administration, security analysis, and cloud management.
          </p>
          
          <h2>Use Cases</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-5 rounded-lg">
              <h3 className="text-blue-800 mb-3">Security Operations</h3>
              <ul>
                <li>Identify the source of incoming network traffic</li>
                <li>Configure firewall rules and security groups</li>
                <li>Validate security alerts involving Azure IPs</li>
                <li>Monitor for unexpected Azure connections</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-lg">
              <h3 className="text-blue-800 mb-3">Network Troubleshooting</h3>
              <ul>
                <li>Debug connectivity issues with Azure services</li>
                <li>Verify if outbound traffic is reaching Azure</li>
                <li>Check if specific IPs are part of expected Azure services</li>
                <li>Troubleshoot VPN and Express Route connections</li>
              </ul>
            </div>
          </div>
          
          <h2>How it Works</h2>
          
          <p>
            This tool uses the official Microsoft Azure IP Ranges and Service Tags data, which is 
            updated and published regularly by Microsoft. Our application automatically downloads the 
            latest data files daily to ensure the information remains current.
          </p>
          
          <div className="bg-gray-50 p-5 rounded-lg mb-8">
            <h3 className="text-gray-700">Our intelligent search understands multiple formats:</h3>
            <ol>
              <li>IP addresses - checks if an address belongs to any Azure ranges</li>
              <li>CIDR notation - identifies Azure IP ranges that overlap with specified blocks</li>
              <li>Service names - shows all IP ranges used by a specific Azure service</li>
              <li>Region names - displays all IP ranges associated with a particular Azure region</li>
              <li>Combined service.region format - finds specific service deployments in specific regions</li>
            </ol>
          </div>
          
          <h2>Search Features</h2>
          
          <p>
            Azure IP Lookup offers a simplified, intelligent search experience that automatically 
            detects what you're looking for:
          </p>
          
          <ul>
            <li>
              <strong>Intelligent Search</strong> – Our search automatically detects what you're looking for - whether it's an IP address (40.112.127.224), CIDR block (10.0.0.0/24), service name (Storage), or region (WestEurope)
            </li>
            <li>
              <strong>Pagination</strong> – Navigate through large result sets efficiently
            </li>
            <li>
              <strong>Multiple Cloud Support</strong> – Covers Azure Public Cloud, China Cloud, US Government Cloud
            </li>
          </ul>
          
          <h2>Network Features Explained</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-5 rounded-lg">
              <h3 className="text-blue-800 mb-3">API and NSG</h3>
              <ul>
                <li><strong>API</strong> - Application Programming Interface endpoints used for Azure service communication and management</li>
                <li><strong>NSG</strong> - Network Security Groups, virtual firewalls for controlling inbound and outbound traffic at the subnet or network interface level</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-5 rounded-lg">
              <h3 className="text-blue-800 mb-3">UDR and FW</h3>
              <ul>
                <li><strong>UDR</strong> - User Defined Routes, custom routing tables that override Azure's default system routes</li>
                <li><strong>FW</strong> - Azure Firewall, a managed cloud-based network security service for protecting Azure Virtual Network resources</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 p-5 rounded-lg mb-8">
            <h3 className="text-blue-800 mb-3">VSE (Virtual Service Endpoint)</h3>
            <p>Virtual Service Endpoints extend your virtual network private address space to Azure service resources, allowing direct access over Azure's backbone network. This provides enhanced security by ensuring traffic remains on the Azure network.</p>
          </div>
          
          <h2>Data Sources</h2>
          
          <p>
            The IP range data comes directly from Microsoft's official download pages:
          </p>
          
          <ul>
            <li><a href="https://www.microsoft.com/en-us/download/details.aspx?id=56519" target="_blank" rel="noopener noreferrer">Azure Public Cloud IP Ranges</a></li>
            <li><a href="https://www.microsoft.com/en-us/download/details.aspx?id=57062" target="_blank" rel="noopener noreferrer">Azure China Cloud IP Ranges</a></li>
            <li><a href="https://www.microsoft.com/en-us/download/details.aspx?id=57063" target="_blank" rel="noopener noreferrer">Azure US Government Cloud IP Ranges</a></li>
          </ul>
          
          <h2>Deployment</h2>
          
          <p>
            Azure IP Lookup is deployed on Vercel for optimal performance:
          </p>
          
          <ul>
            <li>The application is hosted on Vercel for optimal performance</li>
            <li>GitHub Actions is used for automated daily updates</li>
            <li>IP data is kept current with automated fetching from Microsoft</li>
          </ul>
          
          <p className="mt-4">
            See the <Link href="https://github.com/endgor/azure-ip-lookup" className="text-blue-600 hover:text-blue-800">GitHub repository</Link> for more information.
          </p>
          
          <h2>Technical Implementation</h2>
          
          <p>
            This tool is built with modern web technologies:
          </p>
          
          <ul>
            <li>Next.js for server-side rendering and API routes</li>
            <li>TypeScript for type safety and better developer experience</li>
            <li>SWR for efficient data fetching and caching</li>
            <li>Tailwind CSS for responsive and customizable UI</li>
            <li>Node.js backend for processing IP data and handling DNS lookups</li>
          </ul>
          
          <h2>Disclaimer</h2>
          
          <p>
            This tool is not affiliated with Microsoft or Azure. It is an independent project 
            that uses publicly available data. While we strive for accuracy, we cannot guarantee 
            that the data is always 100% current or complete.
          </p>
          
          <p>
            The IP ranges and service tags are provided by Microsoft and are subject to change.
            Always verify critical information through official Microsoft channels.
          </p>
        </div>
      </div>
    </Layout>
  );
}
