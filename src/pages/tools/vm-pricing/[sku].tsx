import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Layout from '@/components/Layout';
import Select, { type SelectOption } from '@/components/shared/Select';
import Tooltip from '@/components/Tooltip';
import HoursPerMonthField from '@/components/vmPricing/HoursPerMonthField';
import { useHoursPerMonth } from '@/hooks/vmPricing/useHoursPerMonth';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import {
  VM_PRICE_MODES,
  formatHourly,
  formatMonthly,
  formatNumber,
  formatPercent,
  getCurrencyLabel,
  getPriceModeLabel,
  resolvePrice
} from '@/lib/vmPricing/pricing';
import {
  getDetailPageSkus,
  getPricingIndex,
  getSeriesSiblings,
  getSkuRegionPrices,
  getSkuSpec,
  type VmRegionPrice
} from '@/lib/vmPricing/serverVmPricing';
import type { VmCurrency, VmCurrencyRate, VmOperatingSystem, VmPriceMode, VmSkuSpec } from '@/types/vmPricing';

interface VmSkuDetailProps {
  spec: VmSkuSpec;
  regionPrices: VmRegionPrice[];
  currencies: VmCurrencyRate[];
  baseCurrency: VmCurrency;
  lastUpdated: string;
  siblings: string[];
}

type PriceDisplay = 'hourly' | 'monthly';

const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400';

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-800"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SpecCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function CapabilityPill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
        enabled
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}

export default function VmSkuDetail({
  spec,
  regionPrices,
  currencies,
  baseCurrency,
  lastUpdated,
  siblings
}: VmSkuDetailProps) {
  const [currency, setCurrency] = useLocalStorageState<VmCurrency>('vm-pricing-currency', baseCurrency);
  const [os, setOs] = useLocalStorageState<VmOperatingSystem>('vm-pricing-os', 'linux');
  const [priceMode, setPriceMode] = useLocalStorageState<VmPriceMode>('vm-pricing-mode', 'payg');
  const [display, setDisplay] = useLocalStorageState<PriceDisplay>('vm-pricing-display', 'hourly');
  const [hoursPerMonth, setHoursPerMonth] = useHoursPerMonth();
  const [showAllRegions, setShowAllRegions] = useState(false);

  const currencyRate = useMemo(
    () => currencies.find((entry) => entry.code === currency)?.rate ?? 1,
    [currencies, currency]
  );

  const formatPrice = (value: number | null): string =>
    display === 'hourly'
      ? formatHourly(value, currency, currencyRate)
      : formatMonthly(value, currency, hoursPerMonth, currencyRate);

  /** Every region that lists a price for the selected OS and pricing model, cheapest first. */
  const ranked = useMemo(() => {
    return regionPrices
      .map((entry) => {
        const resolved = resolvePrice(entry.prices, os, priceMode);
        return { ...entry, hourly: resolved?.hourly ?? null, estimated: resolved?.estimated ?? false };
      })
      .filter((entry) => entry.hourly !== null)
      .sort((a, b) => (a.hourly as number) - (b.hourly as number));
  }, [regionPrices, os, priceMode]);

  const cheapest = ranked[0] ?? null;
  const dearest = ranked[ranked.length - 1] ?? null;

  /** Pinned to the cheapest pay-as-you-go region so the model controls cannot move it. */
  const modelTableRegion = useMemo(() => {
    const byPayg = regionPrices
      .map((entry) => ({ entry, hourly: resolvePrice(entry.prices, 'linux', 'payg')?.hourly ?? null }))
      .filter((item): item is { entry: VmRegionPrice; hourly: number } => item.hourly !== null)
      .sort((a, b) => a.hourly - b.hourly);

    return byPayg[0]?.entry ?? regionPrices[0] ?? null;
  }, [regionPrices]);

  const visibleRegions = showAllRegions ? ranked : ranked.slice(0, 15);

  const vcpus = spec.vcpusAvailable ?? spec.vcpus;
  const isConstrained = spec.vcpusAvailable !== null && spec.vcpus !== null && spec.vcpusAvailable < spec.vcpus;

  const currencyOptions = useMemo<SelectOption[]>(
    () =>
      [...currencies]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((entry) => ({ value: entry.code, label: entry.code, description: getCurrencyLabel(entry.code) })),
    [currencies]
  );

  const spreadFraction =
    cheapest?.hourly && dearest?.hourly && cheapest.hourly > 0 ? dearest.hourly / cheapest.hourly - 1 : null;

  return (
    <Layout
      title={`${spec.size} pricing — Azure VM size`}
      description={`${spec.size} costs, specifications and the cheapest Azure regions. ${
        vcpus ?? '?'
      } vCPU, ${spec.memoryGB ?? '?'} GiB memory, with pay-as-you-go, spot, reserved instance and savings plan rates.`}
      canonicalUrl={`https://azurehub.org/tools/vm-pricing/${spec.sku}/`}
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'VM Pricing', url: 'https://azurehub.org/tools/vm-pricing/' },
        { name: spec.size, url: `https://azurehub.org/tools/vm-pricing/${spec.sku}/` }
      ]}
    >
      <section className="space-y-6">
        <div className="space-y-2">
          <Link
            href="/tools/vm-pricing/"
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All VM sizes
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
              {spec.size}
            </h1>
            {isConstrained && (
              <Tooltip
                widthClass="w-64"
                content={
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Constrained cores</p>
                    <p>
                      Runs on {spec.vcpus}-vCPU hardware with only {spec.vcpusAvailable} active, keeping the full memory
                      and disk throughput while cutting per-core licence costs.
                    </p>
                  </div>
                }
              >
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  constrained
                </span>
              </Tooltip>
            )}
            {spec.specSource === 'unknown' && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                specs n/a
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            {spec.series} series · {spec.category} · ARM name{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{spec.sku}</code> · priced in{' '}
            {ranked.length} region{ranked.length === 1 ? '' : 's'} · updated {lastUpdated}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SpecCard
            label="vCPUs"
            value={formatNumber(vcpus)}
            hint={isConstrained ? `of ${spec.vcpus} physical` : spec.architecture ?? undefined}
          />
          <SpecCard label="Memory" value={spec.memoryGB === null ? '—' : `${formatNumber(spec.memoryGB)} GiB`} />
          <SpecCard
            label="Temp disk"
            value={spec.tempDiskGB ? `${formatNumber(spec.tempDiskGB)} GiB` : 'None'}
            hint={spec.tempDiskGB ? undefined : 'Bring your own data disk'}
          />
          <SpecCard label="GPUs" value={spec.gpuCount ? formatNumber(spec.gpuCount) : '—'} />
          <SpecCard label="Max data disks" value={formatNumber(spec.maxDataDisks)} />
          <SpecCard label="Max NICs" value={formatNumber(spec.maxNetworkInterfaces)} />
          <SpecCard label="Architecture" value={spec.architecture ?? '—'} />
          <SpecCard label="Workload type" value={spec.category} />
        </div>

        {spec.specSource !== 'unknown' && (
          <div className="flex flex-wrap gap-2">
            <CapabilityPill label="Premium SSD" enabled={spec.premiumIO} />
            <CapabilityPill label="Accelerated networking" enabled={spec.acceleratedNetworking} />
            <CapabilityPill label="RDMA" enabled={spec.rdma} />
            <CapabilityPill label="Ephemeral OS disk" enabled={spec.ephemeralOSDisk} />
            <CapabilityPill label="Encryption at host" enabled={spec.encryptionAtHost} />
            <CapabilityPill label="Trusted launch" enabled={spec.trustedLaunch} />
            <CapabilityPill label="Confidential computing" enabled={spec.confidentialComputing} />
            <CapabilityPill label="Hibernation" enabled={spec.hibernation} />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-5 gap-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <span className={labelClass}>Pricing model</span>
            <Select
              ariaLabel="Pricing model"
              value={priceMode}
              onChange={(value) => setPriceMode(value as VmPriceMode)}
              options={VM_PRICE_MODES.map((mode) => ({ value: mode.value, label: mode.label }))}
            />
          </div>

          <div className="space-y-1.5">
            <span className={labelClass}>Operating system</span>
            <Segmented
              ariaLabel="Operating system"
              value={os}
              onChange={setOs}
              options={[
                { value: 'linux', label: 'Linux' },
                { value: 'windows', label: 'Windows' }
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <span className={labelClass}>Show price</span>
            <Segmented
              ariaLabel="Price display"
              value={display}
              onChange={setDisplay}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'monthly', label: 'Monthly' }
              ]}
            />
          </div>

          {display === 'monthly' && (
            <HoursPerMonthField
              id="vm-detail-hours"
              hoursPerMonth={hoursPerMonth}
              onChange={setHoursPerMonth}
              labelClass={labelClass}
            />
          )}

          <div className="min-w-[9rem] space-y-1.5">
            <span className={labelClass}>Currency</span>
            <Select
              ariaLabel="Currency"
              value={currency}
              onChange={setCurrency}
              options={currencyOptions}
              searchable
              searchPlaceholder={`Filter ${currencies.length} currencies...`}
            />
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
            Azure lists no {os === 'windows' ? 'Windows' : 'Linux'} {getPriceModeLabel(priceMode).toLowerCase()} price
            for {spec.size}. Try another pricing model or operating system.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Cheapest region
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(cheapest?.hourly ?? null)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{cheapest?.displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Most expensive
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(dearest?.hourly ?? null)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{dearest?.displayName}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Region spread
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {spreadFraction === null ? '—' : `+${formatPercent(spreadFraction)}`}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {ranked.length} region{ranked.length === 1 ? '' : 's'} priced
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Price by region — {os === 'windows' ? 'Windows' : 'Linux'}, {getPriceModeLabel(priceMode)}
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Region
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Geography
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        {display === 'hourly' ? 'Price / hour' : `Price / month (${hoursPerMonth}h)`}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        vs cheapest
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {visibleRegions.map((entry, position) => {
                      const delta =
                        cheapest?.hourly && entry.hourly ? (entry.hourly as number) / cheapest.hourly - 1 : null;

                      return (
                        <tr key={entry.region} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-3 py-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{entry.displayName}</span>
                            {position === 0 && (
                              <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                cheapest
                              </span>
                            )}
                            <span className="ml-1.5 text-[11px] text-slate-400 dark:text-slate-500">{entry.region}</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {entry.geography}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                            {formatPrice(entry.hourly)}
                            {entry.estimated && (
                              <span className="ml-0.5 text-amber-500 dark:text-amber-400" title="Estimated rate">
                                *
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {delta === null || delta === 0 ? (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">+{formatPercent(delta)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {ranked.length > 15 && (
                <button
                  type="button"
                  onClick={() => setShowAllRegions((current) => !current)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {showAllRegions ? 'Show cheapest 15' : `Show all ${ranked.length} regions`}
                </button>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Every pricing model in {modelTableRegion?.displayName}
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Pricing model
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Linux
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      >
                        Windows
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {VM_PRICE_MODES.map((mode) => {
                      const linux = modelTableRegion ? resolvePrice(modelTableRegion.prices, 'linux', mode.value) : null;
                      const windows = modelTableRegion
                        ? resolvePrice(modelTableRegion.prices, 'windows', mode.value)
                        : null;

                      return (
                        <tr
                          key={mode.value}
                          className={mode.value === priceMode ? 'bg-sky-50/60 dark:bg-sky-500/10' : undefined}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                            {mode.label}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                            {formatPrice(linux?.hourly ?? null)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                            {formatPrice(windows?.hourly ?? null)}
                            {windows?.estimated && (
                              <span className="ml-0.5 text-amber-500 dark:text-amber-400" title="Estimated rate">
                                *
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {siblings.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Other {spec.series} sizes
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((sibling) => (
                <Link
                  key={sibling}
                  href={`/tools/vm-pricing/${sibling}/`}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {sibling.replace(/^Standard_/, '')}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">About these prices</h2>
          <p>
            Retail list prices excluding tax, storage, networking and any Enterprise Agreement or CSP discount. A listed
            price does not guarantee quota or capacity in a region, and moving region can change latency, data residency
            and egress costs.
          </p>
          <p>
            Reserved instance and savings plan rates are the commitment price spread across the term and are sold
            without an OS licence. Azure publishes no meter for every combination, so a rate marked{' '}
            <span className="font-medium text-amber-600 dark:text-amber-400">*</span> is derived: a Windows commitment
            rate is the Linux rate plus the Windows pay-as-you-go surcharge, and a missing Dev/Test rate is the Linux
            pay-as-you-go rate, since Dev/Test only discounts the Windows licence.
          </p>
          {currency !== baseCurrency && (
            <p>
              Azure quotes each currency as the {baseCurrency} price times one exchange rate it sets monthly, so{' '}
              {currency} figures here are that same conversion.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: getDetailPageSkus().map((sku) => ({ params: { sku } })),
    fallback: false
  };
};

export const getStaticProps: GetStaticProps<VmSkuDetailProps> = async ({ params }) => {
  const sku = typeof params?.sku === 'string' ? params.sku : '';
  const spec = getSkuSpec(sku);

  if (!spec) {
    return { notFound: true };
  }

  const index = getPricingIndex();

  return {
    props: {
      spec,
      regionPrices: getSkuRegionPrices(sku),
      currencies: index.currencies,
      baseCurrency: index.baseCurrency,
      lastUpdated: index.lastUpdated,
      siblings: getSeriesSiblings(sku, spec.series)
    }
  };
};
