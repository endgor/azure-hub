import Layout from '@/components/Layout';
import Link from 'next/link';
import VersionDisplay from '@/components/VersionDisplay';
import DefinitionsTable from '@/components/DefinitionsTable';
import { GetStaticProps } from 'next';
import { getFileMetadata } from '@/lib/ipService';
import { AzureFileMetadata } from '@/types/azure';

interface AboutProps {
  fileMetadata: AzureFileMetadata[];
}

export default function About({ fileMetadata }: AboutProps) {
  // FAQ structured data for better Google visibility
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Azure IP Lookup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Azure IP Lookup is a free tool that helps you identify if an IP address belongs to Microsoft Azure infrastructure. You can search by IP address, CIDR range, service name, or region to discover which Azure services are using specific IP ranges."
        }
      },
      {
        "@type": "Question",
        "name": "How often is the Azure IP data updated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our Azure IP range data is automatically updated daily from Microsoft's official sources, including Azure Public Cloud, Azure China Cloud, and Azure US Government Cloud. This ensures you always have access to the most current IP range information."
        }
      },
      {
        "@type": "Question",
        "name": "What are Azure Service Tags?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Azure Service Tags are groups of IP address prefixes from a given Azure service. They help simplify security rule creation for Azure resources by allowing you to define network access controls based on service tags rather than specific IP addresses."
        }
      },
      {
        "@type": "Question",
        "name": "Can I search for IP ranges by region?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can search for Azure IP ranges by specific regions like WestEurope, EastUS, or any other Azure region. You can also combine region and service filters to find IP ranges for specific services in specific regions."
        }
      },
      {
        "@type": "Question",
        "name": "What is a CIDR range?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CIDR (Classless Inter-Domain Routing) is a method for allocating IP addresses and routing. A CIDR range like 74.7.51.32/29 represents a block of IP addresses. Our tool can find Azure IP ranges that overlap with your specified CIDR block."
        }
      },
      {
        "@type": "Question",
        "name": "Is Azure IP Lookup affiliated with Microsoft?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No, Azure IP Lookup is not affiliated with Microsoft. This is an independent tool that uses publicly available APIs provided by Microsoft Azure to help users identify and search Azure IP ranges and service tags."
        }
      }
    ]
  };

  return (
    <Layout title="About Azure IP Lookup - Azure Service IP Range Finder">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-3xl mx-auto">
        <article className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-google-gray-800">About Azure IP Lookup</h1>
        </article>
        
        <div className="prose prose-blue max-w-none">
     
          <h2>How it Works</h2>
          
          <p>
            This tool uses official Microsoft Azure IP Ranges and Service Tags data that is updated daily. All data is sourced from
            publicly available APIs provided by Microsoft Azure. You can <Link href="/" className="text-blue-600 hover:underline">
            search for IP addresses, CIDR ranges, or service names</Link> on the main page, or <Link href="/service-tags" 
            className="text-blue-600 hover:underline">browse all available service tags</Link> in our directory.
          </p>

          <h2>Definitions</h2>
          
          <p>
            These are the different Service Tag definitions we&apos;re currently using:
          </p>
          
          <DefinitionsTable metadata={fileMetadata} />

          <h2>Network Features</h2>
          
          <p>Service tags may include network features with the following abbreviations:</p>
          
          <ul>
            <li><strong>API</strong> - Application Programming Interface endpoints</li>
            <li><strong>NSG</strong> - Network Security Groups for controlling traffic</li>
            <li><strong>UDR</strong> - User Defined Routes for custom routing</li>
            <li><strong>FW</strong> - Azure Firewall service</li>
            <li><strong>VSE</strong> - Virtual Service Endpoints for secure Azure service access</li>
          </ul>
          
          <h2>Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">What is Azure IP Lookup?</h3>
              <p>
                Azure IP Lookup is a free tool that helps you identify if an IP address belongs to Microsoft Azure infrastructure.
                You can search by IP address, CIDR range, service name, or region to discover which Azure services are using specific IP ranges.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">How often is the Azure IP data updated?</h3>
              <p>
                Our Azure IP range data is automatically updated daily from Microsoft&apos;s official sources, including Azure Public Cloud,
                Azure China Cloud, and Azure US Government Cloud. This ensures you always have access to the most current IP range information.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">What are Azure Service Tags?</h3>
              <p>
                Azure Service Tags are groups of IP address prefixes from a given Azure service. They help simplify security rule creation
                for Azure resources by allowing you to define network access controls based on service tags rather than specific IP addresses.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Can I search for IP ranges by region?</h3>
              <p>
                Yes, you can search for Azure IP ranges by specific regions like WestEurope, EastUS, or any other Azure region.
                You can also combine region and service filters to find IP ranges for specific services in specific regions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">What is a CIDR range?</h3>
              <p>
                CIDR (Classless Inter-Domain Routing) is a method for allocating IP addresses and routing. A CIDR range like 74.7.51.32/29
                represents a block of IP addresses. Our tool can find Azure IP ranges that overlap with your specified CIDR block.
              </p>
            </div>
          </div>

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

export const getStaticProps: GetStaticProps<AboutProps> = async () => {
  try {
    const fileMetadata = await getFileMetadata();
    return {
      props: {
        fileMetadata,
      },
    };
  } catch (error) {
    return {
      props: {
        fileMetadata: [],
      },
    };
  }
};
