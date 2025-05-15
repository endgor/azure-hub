import Layout from '@/components/Layout';
import Link from 'next/link';

export default function About() {
  return (
    <Layout title="About Azure IP Lookup - Azure Service IP Range Finder">
      <div className="max-w-3xl mx-auto">
        <article className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-800">About Azure IP Lookup</h1>
          <p className="text-xl text-gray-600 mb-6">
            Discover Azure IP ranges and verify IP addresses against Microsoft Azure infrastructure
          </p>
        </article>
        
        <div className="prose prose-blue max-w-none">
          <p>
            Azure IP Lookup is a tool that helps you identify whether an IP address belongs to Microsoft Azure services.
            Use it to check if IP addresses are part of Azure infrastructure or to find all IP ranges for specific Azure Service Tags.
          </p>
          
          <h2>How it Works</h2>
          
          <p>
            This tool uses official Microsoft Azure IP Ranges and Service Tags data that is updated daily. All data is sourced from
            publicly available APIs provided by Microsoft Azure.
          </p>
          
          <h2>Network Features</h2>
          
          <p>Service tags may include network features with the following abbreviations:</p>
          
          <ul>
            <li><strong>API</strong> - Application Programming Interface endpoints</li>
            <li><strong>NSG</strong> - Network Security Groups for controlling traffic</li>
            <li><strong>UDR</strong> - User Defined Routes for custom routing</li>
            <li><strong>FW</strong> - Azure Firewall service</li>
            <li><strong>VSE</strong> - Virtual Service Endpoints for secure Azure service access</li>
          </ul>
          
          <h2>Disclaimer</h2>
          
          <p>
            This tool is not affiliated with Microsoft. All data presented is sourced from publicly available 
            APIs provided by Microsoft Azure. For more technical details, visit the <Link href="https://github.com/endgor/azure-ip-lookup">
            <span className="text-blue-600 hover:underline">GitHub repository</span></Link>.
          </p>
        </div>
      </div>
    </Layout>
  );
}
