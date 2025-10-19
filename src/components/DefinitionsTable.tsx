import { memo } from 'react';
import { AzureFileMetadata } from '../types/azure';

interface DefinitionsTableProps {
  metadata: AzureFileMetadata[];
}

const DefinitionsTable = memo(function DefinitionsTable({ metadata }: DefinitionsTableProps) {
  if (!metadata || metadata.length === 0) {
    return <div className="px-4 py-3 text-sm text-slate-400">File information not available.</div>;
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
      <table className="min-w-full divide-y divide-slate-800/70 text-sm text-slate-200">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Cloud</th>
            <th className="px-4 py-3 text-left">Change</th>
            <th className="px-4 py-3 text-left">Download</th>
            <th className="px-4 py-3 text-left">Last Retrieved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {metadata
            .sort((a, b) => a.cloud.localeCompare(b.cloud))
            .map((file, index) => (
              <tr key={file.cloud} className={index % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20'}>
                <td className="px-4 py-3 font-semibold text-slate-100 break-words">
                  {getCloudDisplayName(file.cloud)}
                </td>
                <td className="px-4 py-3 text-slate-200 break-words">
                  {file.changeNumber}
                </td>
                <td className="px-4 py-3 break-words">
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-200 hover:text-sky-100 hover:underline"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className="px-4 py-3 text-slate-300 break-words">
                  {formatDate(file.lastRetrieved)}
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
});

export default DefinitionsTable;
