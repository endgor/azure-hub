import { useState, useEffect } from 'react';
import { AzureFileMetadata } from '../types/azure';

interface FileVersionsTableProps {
  className?: string;
}

export default function FileVersionsTable({ className = '' }: FileVersionsTableProps) {
  const [metadata, setMetadata] = useState<AzureFileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/file-metadata');
        if (!response.ok) {
          throw new Error('Failed to fetch file metadata');
        }
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching file metadata:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, []);

  if (loading) {
    return <div className={`text-gray-500 ${className}`}>Loading file information...</div>;
  }

  if (error || !metadata.length) {
    return <div className={`text-gray-500 ${className}`}>File information not available</div>;
  }

  const getCloudDisplayName = (cloud: string): string => {
    switch (cloud) {
      case 'AzureCloud':
        return 'Public';
      case 'AzureChinaCloud':
        return 'China';
      case 'AzureUSGovernment':
        return 'AzureGovernment';
      case 'AzureGermany':
        return 'AzureGermany';
      default:
        return cloud;
    }
  };

  return (
    <div className={className}>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Cloud</th>
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Change Number</th>
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Download</th>
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Last Retrieved</th>
          </tr>
        </thead>
        <tbody>
          {metadata
            .sort((a, b) => a.cloud.localeCompare(b.cloud))
            .map((file) => (
              <tr key={file.cloud} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  <span className="font-medium text-blue-600">
                    {getCloudDisplayName(file.cloud)}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2">{file.changeNumber}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className="border border-gray-300 px-4 py-2">{file.lastRetrieved}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}