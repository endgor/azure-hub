declare module 'dns-lookup-promise' {
  export function dnsLookup(hostname: string, options?: {
    family?: number;
    hints?: number;
    all?: boolean;
  }): Promise<{
    address: string;
    family: number;
  } | {
    address: string;
    family: number;
  }[]>;
}