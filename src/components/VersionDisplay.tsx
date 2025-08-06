import { useState, useEffect } from 'react';
import { AzureCloudVersions } from '../lib/ipService';

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
        const response = await fetch('/api/versions');
        if (!response.ok) {
          throw new Error('Failed to fetch versions');
        }
        const data = await response.json();
        setVersions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching versions:', err);
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
    <div className={`text-xs text-gray-500 ${className}`}>
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