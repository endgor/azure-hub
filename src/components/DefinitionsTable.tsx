import { useState, useEffect } from 'react';
import { AzureFileMetadata } from '../types/azure';

export default function DefinitionsTable() {
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
    return <div className="text-gray-500">Loading file information...</div>;
  }

  if (error || !metadata.length) {
    return <div className="text-gray-500">File information not available</div>;
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Cloud</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Change Number</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Download</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase">Last Retrieved</th>
          </tr>
        </thead>
        <tbody>
          {metadata
            .sort((a, b) => a.cloud.localeCompare(b.cloud))
            .map((file) => (
              <tr key={file.cloud} className="border-b border-gray-100">
                <td className="px-4 py-4 text-sm">
                  <span className="font-medium text-blue-600">
                    {getCloudDisplayName(file.cloud)}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {file.changeNumber}
                </td>
                <td className="px-4 py-4 text-sm">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {formatDate(file.lastRetrieved)}
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}