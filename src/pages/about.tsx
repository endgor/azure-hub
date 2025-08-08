import Layout from '@/components/Layout';
import Link from 'next/link';
import VersionDisplay from '@/components/VersionDisplay';
import FileVersionsTable from '@/components/FileVersionsTable';

export default function About() {
  return (
    <Layout title="About Azure IP Lookup - Azure Service IP Range Finder">
      <div className="max-w-3xl mx-auto">
        <article className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-800">About Azure IP Lookup</h1>
        </article>
        
        <div className="prose prose-blue max-w-none">
          
          <h2>Definitions</h2>
          
          <p>
            These are the different Service Tag definitions we&apos;re currently using:
          </p>
          
          <FileVersionsTable className="mb-6" />
          
          <h2>How it Works</h2>
          
          <p>
            This tool uses official Microsoft Azure IP Ranges and Service Tags data that is updated daily. All data is sourced from
            publicly available APIs provided by Microsoft Azure. You can <Link href="/" className="text-blue-600 hover:underline">
            search for IP addresses, CIDR ranges, or service names</Link> on the main page, or <Link href="/service-tags" 
            className="text-blue-600 hover:underline">browse all available service tags</Link> in our directory.
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
