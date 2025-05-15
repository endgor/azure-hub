declare module 'dns-lookup-promise' {
  interface DnsLookupResult {
    address: string;
    family: number;
  }

  export function dnsLookup(hostname: string, options?: {
    family?: number;
    hints?: number;
    all?: boolean;
  }): Promise<DnsLookupResult>;
}