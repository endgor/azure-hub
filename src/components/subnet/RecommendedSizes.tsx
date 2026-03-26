import { useState, type ReactElement } from 'react';

interface SubnetRecommendation {
  name: string;
  minPrefix: number;
  recommendedPrefix: number;
  notes: string;
}

const RECOMMENDATIONS: SubnetRecommendation[] = [
  { name: 'GatewaySubnet', minPrefix: 29, recommendedPrefix: 27, notes: '/29 only for Basic SKU. All other SKUs require /27 or larger. Use /26 with 16+ ExpressRoute circuits.' },
  { name: 'AzureFirewallSubnet', minPrefix: 26, recommendedPrefix: 26, notes: 'Fixed /26 requirement. Sufficient for all scaling scenarios.' },
  { name: 'AzureFirewallManagementSubnet', minPrefix: 26, recommendedPrefix: 26, notes: 'Required when Management NIC or forced tunneling is enabled.' },
  { name: 'AzureBastionSubnet', minPrefix: 26, recommendedPrefix: 26, notes: 'Minimum /26 required since Nov 2021. Needed for host scaling.' },
  { name: 'RouteServerSubnet', minPrefix: 26, recommendedPrefix: 26, notes: 'Dedicated subnet, minimum /26. No NSG or UDR support.' },
  { name: 'Application Gateway v2', minPrefix: 26, recommendedPrefix: 24, notes: 'Supports up to 125 instances. /24 highly recommended for autoscaling.' },
  { name: 'Azure API Management', minPrefix: 29, recommendedPrefix: 27, notes: 'Classic VNet injection min /29. Premium v2 requires /27. Each scale unit uses 2 IPs.' },
  { name: 'Azure Container Instances', minPrefix: 29, recommendedPrefix: 24, notes: 'Delegated subnet. Smallest supported is /29 (8 IPs). One IP per container group.' },
  { name: 'AKS Node Subnet', minPrefix: 24, recommendedPrefix: 22, notes: 'Highly variable. With Azure CNI, each pod uses a VNet IP. With Overlay/kubenet, only nodes need IPs.' },
  { name: 'Azure NetApp Files', minPrefix: 28, recommendedPrefix: 26, notes: 'Delegated subnet. /28 provides only 11 usable IPs. Use /24 for SAP workloads.' },
  { name: 'Private Endpoints', minPrefix: 29, recommendedPrefix: 27, notes: 'One IP per endpoint. Plan for growth.' },
  { name: 'VM Workloads (small)', minPrefix: 29, recommendedPrefix: 26, notes: '~59 usable IPs after Azure reservations.' },
  { name: 'VM Workloads (medium)', minPrefix: 29, recommendedPrefix: 24, notes: '~251 usable IPs. Common default choice.' },
];

export default function RecommendedSizes(): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-expanded={isOpen}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        Recommended sizes
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Subnet</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Minimum</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Recommended</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Notes</th>
                </tr>
              </thead>
              <tbody>
                {RECOMMENDATIONS.map((rec) => (
                  <tr
                    key={rec.name}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {rec.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400">
                      /{rec.minPrefix}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">
                      <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 font-mono font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        /{rec.recommendedPrefix}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {rec.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
