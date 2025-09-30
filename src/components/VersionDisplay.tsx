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
          <span>Public: v{versions.AzureCloud}</span>
        )}
        {versions.AzureChinaCloud && (
          <span>China: v{versions.AzureChinaCloud}</span>
        )}
        {versions.AzureUSGovernment && (
          <span>US Gov: v{versions.AzureUSGovernment}</span>
        )}
      </div>
    </div>
  );
}