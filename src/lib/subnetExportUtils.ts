import {
  LeafSubnet,
  hostCapacity,
  hostCapacityAzure,
  inetNtoa,
  subnetLastAddress,
  subnetNetmask,
  usableRange,
  usableRangeAzure
} from '@/lib/subnetCalculator';

export type SubnetExportRow = Record<string, string | number>;

function formatRange(first: number, last: number): string {
  if (first === last) {
    return inetNtoa(first);
  }
  return `${inetNtoa(first)} - ${inetNtoa(last)}`;
}

export function prepareSubnetExportData(
  leaves: LeafSubnet[],
  useAzureReservations: boolean,
  rowComments: Record<string, string> = {}
): SubnetExportRow[] {
  if (leaves.length === 0) {
    return [];
  }

  const usableLabel = useAzureReservations ? 'Usable Range (Azure)' : 'Usable Range';
  const hostLabel = useAzureReservations ? 'Host Capacity (Azure)' : 'Host Capacity';

  return leaves.map((leaf) => {
    const lastAddress = subnetLastAddress(leaf.network, leaf.prefix);
    const usable = useAzureReservations
      ? usableRangeAzure(leaf.network, leaf.prefix)
      : usableRange(leaf.network, leaf.prefix);
    const hostCount = useAzureReservations ? hostCapacityAzure(leaf.prefix) : hostCapacity(leaf.prefix);

    return {
      Subnet: `${inetNtoa(leaf.network)}/${leaf.prefix}`,
      Netmask: inetNtoa(subnetNetmask(leaf.prefix)),
      'Range of Addresses': formatRange(leaf.network, lastAddress),
      [usableLabel]: usable ? formatRange(usable.first, usable.last) : 'Reserved',
      [hostLabel]: hostCount,
      Comment: rowComments[leaf.id] ?? ''
    };
  });
}

export function generateSubnetExportFilename(
  baseNetwork: number,
  basePrefix: number,
  useAzureReservations: boolean,
  format: 'csv' | 'xlsx' | 'md'
): string {
  const networkLabel = inetNtoa(baseNetwork).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const modeLabel = useAzureReservations ? 'azure' : 'standard';
  const timestamp = new Date().toISOString().slice(0, 10);

  return `subnet-plan_${networkLabel}_${basePrefix}_${modeLabel}_${timestamp}.${format}`;
}
