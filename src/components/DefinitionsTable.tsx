import { memo } from 'react';
import { AzureFileMetadata } from '../types/azure';
import { tableBody, tableCell, tableClass, tableHeadCell, tableHeadRow, tableRow, tableShell } from '@/components/shared/tableStyles';

interface DefinitionsTableProps {
  metadata: AzureFileMetadata[];
}

const DefinitionsTable = memo(function DefinitionsTable({ metadata }: DefinitionsTableProps) {
  if (!metadata || metadata.length === 0) {
    return <div className="px-4 py-3 text-sm text-slate-500">File information not available.</div>;
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
    <div className={tableShell}>
      <table className={`${tableClass} text-slate-600 dark:text-slate-300`}>
        <thead>
          <tr className={tableHeadRow}>
            <th className={tableHeadCell}>Cloud</th>
            <th className={tableHeadCell}>Change</th>
            <th className={tableHeadCell}>Download</th>
            <th className={tableHeadCell}>Last Retrieved</th>
          </tr>
        </thead>
        <tbody className={tableBody}>
          {metadata
            .sort((a, b) => a.cloud.localeCompare(b.cloud))
            .map((file) => (
              <tr key={file.cloud} className={tableRow}>
                <td className={`${tableCell} break-words font-semibold text-slate-900 dark:text-slate-100`}>
                  {getCloudDisplayName(file.cloud)}
                </td>
                <td className={`${tableCell} break-words`}>{file.changeNumber}</td>
                <td className={`${tableCell} break-words`}>
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    {file.filename}
                  </a>
                </td>
                <td className={`${tableCell} break-words`}>{formatDate(file.lastRetrieved)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
});

export default DefinitionsTable;
