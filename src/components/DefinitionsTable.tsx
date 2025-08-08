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
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cloud</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Download</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Retrieved</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {metadata
            .sort((a, b) => a.cloud.localeCompare(b.cloud))
            .map((file, index) => (
              <tr key={file.cloud} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-blue-600 break-words">
                  {getCloudDisplayName(file.cloud)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
                  {file.changeNumber}
                </td>
                <td className="px-6 py-4 text-sm break-words">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 break-words">
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