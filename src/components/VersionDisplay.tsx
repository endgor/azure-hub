import { useState, useEffect } from 'react';
import { AzureCloudVersions } from '../types/azure';
import { getVersions } from '@/lib/clientIpService';

interface VersionDisplayProps {
  className?: string;
}

export default function VersionDisplay({ className = '' }: VersionDisplayProps) {
  const [versions, setVersions] = useState<AzureCloudVersions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const data = await getVersions();
        setVersions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, []);

  if (loading) return null;
  if (error || !versions) return null;

  const hasVersions = Object.keys(versions).length > 0;
  if (!hasVersions) return null;

  return (
    <div className={`text-gray-500 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {versions.AzureCloud && (
          <span>Public: v{typeof versions.AzureCloud === 'string' ? versions.AzureCloud : versions.AzureCloud.version}</span>
        )}
        {versions.AzureChinaCloud && (
          <span>China: v{typeof versions.AzureChinaCloud === 'string' ? versions.AzureChinaCloud : versions.AzureChinaCloud.version}</span>
        )}
        {versions.AzureUSGovernment && (
          <span>US Gov: v{typeof versions.AzureUSGovernment === 'string' ? versions.AzureUSGovernment : versions.AzureUSGovernment.version}</span>
        )}
      </div>
    </div>
  );
}