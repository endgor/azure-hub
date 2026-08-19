import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import ErrorBox from '@/components/shared/ErrorBox';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ExportMenu, { type ExportOption } from '@/components/shared/ExportMenu';
import VmPricingControls, { type VmPriceDisplay } from '@/components/vmPricing/VmPricingControls';
import VmFilterPanel from '@/components/vmPricing/VmFilterPanel';
import VmPricingTable from '@/components/vmPricing/VmPricingTable';
import VmComparisonPanel from '@/components/vmPricing/VmComparisonPanel';
import VmCompareTray from '@/components/vmPricing/VmCompareTray';
import VmComparisonDialog from '@/components/vmPricing/VmComparisonDialog';
import { useVmPricingData } from '@/hooks/vmPricing/useVmPricingData';
import { useVmFilters } from '@/hooks/vmPricing/useVmFilters';
import { useHoursPerMonth } from '@/hooks/vmPricing/useHoursPerMonth';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { getPriceModeLabel, HOURS_PER_MONTH } from '@/lib/vmPricing/pricing';
import { exportToCSV, exportToExcel, exportToMarkdown, type ExportRow } from '@/lib/exportUtils';
import { getDateTimestamp } from '@/lib/filenameUtils';
import type { VmCurrency, VmOperatingSystem, VmPriceMode } from '@/types/vmPricing';

const DEFAULT_REGION = 'westeurope';
const PAGE_SIZE = 50;
const MAX_COMPARISON = 4;

export default function VmPricing() {
  const [region, setRegion] = useLocalStorageState<string>('vm-pricing-region', DEFAULT_REGION);
  const [currency, setCurrency] = useLocalStorageState<VmCurrency>('vm-pricing-currency', 'USD');
  const [os, setOs] = useLocalStorageState<VmOperatingSystem>('vm-pricing-os', 'linux');
  const [priceMode, setPriceMode] = useLocalStorageState<VmPriceMode>('vm-pricing-mode', 'payg');
  const [display, setDisplay] = useLocalStorageState<VmPriceDisplay>('vm-pricing-display', 'hourly');
  const [hoursPerMonth, setHoursPerMonth] = useHoursPerMonth();

  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);

  const { index, catalog, regionPrices, isLoadingCatalogue, isLoadingPrices, catalogueError, priceError, retry } =
    useVmPricingData(region);

  const regionIndex = useMemo(() => {
    if (!index) return null;
    const position = index.regions.findIndex((entry) => entry.name === region);
    return position === -1 ? null : position;
  }, [index, region]);

  /** Azure derives every currency from the base price with one dated rate. */
  const currencyRate = useMemo(
    () => index?.currencies.find((entry) => entry.code === currency)?.rate ?? 1,
    [index, currency]
  );

  const activeRegion = useMemo(
    () => index?.regions.find((entry) => entry.name === region) ?? null,
    [index, region]
  );

  const {
    filters,
    updateFilter,
    toggleListValue,
    resetFilters,
    activeFilterCount,
    rows,
    filteredRows,
    unpricedCount,
    categoryFacets,
    seriesFacets,
    architectureFacets,
    featureFacets,
    vcpuPresetCounts,
    memoryPresetCounts,
    sortKey,
    sortDirection,
    toggleSort
  } = useVmFilters({
    specs: catalog?.skus ?? [],
    regionPrices,
    os,
    priceMode,
    regionIndex,
    hoursPerMonth,
    currencyRate
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sortKey, sortDirection, region, currency, os, priceMode]);

  // Never let the dialog reopen on its own once the selection drops below a pair.
  useEffect(() => {
    if (selectedSkus.length < 2) setIsComparisonOpen(false);
  }, [selectedSkus.length]);

  const toggleSelect = useCallback((sku: string) => {
    setSelectedSkus((current) => {
      if (current.includes(sku)) return current.filter((entry) => entry !== sku);
      if (current.length >= MAX_COMPARISON) return [...current.slice(1), sku];
      return [...current, sku];
    });
  }, []);

  const comparisonRows = useMemo(() => {
    const byKey = new Map(rows.map((row) => [row.spec.sku, row]));
    return selectedSkus.map((sku) => byKey.get(sku)).filter((row): row is (typeof rows)[number] => row !== undefined);
  }, [rows, selectedSkus]);

  const prepareExportData = useCallback((): ExportRow[] => {
    const multiplier = display === 'hourly' ? 1 : hoursPerMonth;
    const priceLabel =
      display === 'hourly' ? `Price/hour (${currency})` : `Price/${hoursPerMonth}h month (${currency})`;

    return filteredRows.map((row) => ({
      Size: row.spec.size,
      'ARM SKU': row.spec.sku,
      Series: row.spec.series,
      'Workload type': row.spec.category,
      vCPUs: row.spec.vcpusAvailable ?? row.spec.vcpus ?? '',
      'Memory (GiB)': row.spec.memoryGB ?? '',
      'Temp disk (GiB)': row.spec.tempDiskGB ?? '',
      GPUs: row.spec.gpuCount ?? '',
      Architecture: row.spec.architecture ?? '',
      [priceLabel]: row.hourly === null ? '' : Number((row.hourly * multiplier * currencyRate).toFixed(4)),
      'Estimated Windows commitment': row.estimated ? 'Yes' : 'No',
      Region: region,
      'Operating system': os === 'windows' ? 'Windows' : 'Linux',
      'Pricing model': getPriceModeLabel(priceMode)
    }));
  }, [filteredRows, display, currency, region, os, priceMode, hoursPerMonth, currencyRate]);

  const exportOptions: ExportOption[] = useMemo(() => {
    const baseName = `azure-vm-pricing_${region}_${currency.toLowerCase()}_${getDateTimestamp()}`;

    const run = async (task: () => void | Promise<void>) => {
      setIsExporting(true);
      try {
        await task();
      } finally {
        setIsExporting(false);
      }
    };

    return [
      {
        label: 'Export as CSV',
        format: 'csv',
        extension: '.csv',
        onClick: () => run(() => exportToCSV(prepareExportData(), `${baseName}.csv`))
      },
      {
        label: 'Export as Excel',
        format: 'xlsx',
        extension: '.xlsx',
        onClick: () => run(() => exportToExcel(prepareExportData(), `${baseName}.xlsx`, 'VM Pricing'))
      },
      {
        label: 'Export as Markdown',
        format: 'md',
        extension: '.md',
        onClick: () => run(() => exportToMarkdown(prepareExportData(), `${baseName}.md`))
      }
    ];
  }, [prepareExportData, region, currency]);

  return (
    <Layout
      title="Azure VM Pricing Comparison - Up to Date Retail Prices"
      description="Look up and compare Azure virtual machine prices by region, vCPU, and memory. Pay-as-you-go, spot, reserved instance and savings plan rates in 40+ currencies, straight from the Azure Retail Prices API."
      keywords={[
        'Azure VM pricing',
        'Azure virtual machine price',
        'Azure VM cost calculator',
        'Azure spot pricing',
        'Azure reserved instance pricing',
        'Azure savings plan',
        'compare Azure VM sizes',
        'Azure VM comparison'
      ]}
      breadcrumbs={[
        { name: 'Home', url: 'https://azurehub.org/' },
        { name: 'VM Pricing', url: 'https://azurehub.org/tools/vm-pricing/' }
      ]}
      toolSchema={{
        name: 'Azure VM Pricing Comparison',
        applicationCategory: 'BusinessApplication',
        offers: { price: '0' }
      }}
    >
      <section className="space-y-8">
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/80 dark:text-blue-400 md:tracking-[0.3em]">
            Compute
          </p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
            Azure VM Pricing
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Look up what any Azure VM size costs, filter by the specs you actually need, and compare sizes side by side.
            Prices come from the Azure Retail Prices API and specifications from Azure resource SKUs.
            {index && (
              <>
                {' '}
                Last updated <span className="font-medium">{index.lastUpdated}</span>.
              </>
            )}
          </p>
        </div>

        {catalogueError ? (
          <ErrorBox title="VM pricing data unavailable">
            <div className="space-y-3">
              <p>{catalogueError}</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg border border-current px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
              >
                Try again
              </button>
            </div>
          </ErrorBox>
        ) : isLoadingCatalogue || !index ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <LoadingSpinner label="Loading VM catalogue..." />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <VmPricingControls
                regions={index.regions}
                region={region}
                onRegionChange={setRegion}
                currency={currency}
                currencies={index.currencies}
                onCurrencyChange={setCurrency}
                os={os}
                onOsChange={setOs}
                priceMode={priceMode}
                onPriceModeChange={setPriceMode}
                display={display}
                onDisplayChange={setDisplay}
                hoursPerMonth={hoursPerMonth}
                onHoursPerMonthChange={setHoursPerMonth}
              />

              <div className="border-t border-slate-100 dark:border-slate-800" />

              <VmFilterPanel
                filters={filters}
                updateFilter={updateFilter}
                toggleListValue={toggleListValue}
                resetFilters={resetFilters}
                activeFilterCount={activeFilterCount}
                categoryFacets={categoryFacets}
                seriesFacets={seriesFacets}
                architectureFacets={architectureFacets}
                featureFacets={featureFacets}
                vcpuPresetCounts={vcpuPresetCounts}
                memoryPresetCounts={memoryPresetCounts}
                resultCount={filteredRows.length}
                totalCount={rows.length}
                unpricedCount={unpricedCount}
                currency={currency}
                hoursPerMonth={hoursPerMonth}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeRegion?.displayName ?? region} · {os === 'windows' ? 'Windows' : 'Linux'} ·{' '}
                  {getPriceModeLabel(priceMode)} · {currency}
                  {isLoadingPrices && <span className="ml-2 italic">updating...</span>}
                </p>
                <ExportMenu options={exportOptions} itemCount={filteredRows.length} isExporting={isExporting} />
              </div>

              {priceError ? (
                <ErrorBox title="Prices unavailable for this region" variant="warning">
                  <div className="space-y-3">
                    <p>{priceError}</p>
                    <p>Pick another region above, or try again.</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="rounded-lg border border-current px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                    >
                      Try again
                    </button>
                  </div>
                </ErrorBox>
              ) : isLoadingPrices && !regionPrices ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                  <LoadingSpinner label={`Loading prices for ${activeRegion?.displayName ?? region}...`} />
                </div>
              ) : (
                <VmPricingTable
                  rows={filteredRows}
                  currency={currency}
                  priceMode={priceMode}
                  display={display}
                  hoursPerMonth={hoursPerMonth}
                  currencyRate={currencyRate}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  selectedSkus={selectedSkus}
                  onToggleSelect={toggleSelect}
                  visibleCount={visibleCount}
                  onShowMore={() => setVisibleCount((current) => current + PAGE_SIZE)}
                />
              )}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">How these prices work</h2>
              <p>
                Rates are retail list prices excluding tax, and exclude storage, networking and any Enterprise Agreement
                or CSP discount. Monthly figures assume {hoursPerMonth} running hours
                {hoursPerMonth === HOURS_PER_MONTH ? ' (an always-on VM)' : ''}.
              </p>
              <p>
                Reserved instance and savings plan rates are the commitment price spread across the term, and are sold
                without an OS licence. Azure publishes no meter for every combination, so a rate marked with{' '}
                <span className="font-medium text-amber-600 dark:text-amber-400">*</span> is derived: a Windows
                commitment rate is the Linux rate plus the Windows pay-as-you-go surcharge, and a missing Dev/Test rate
                is the Linux pay-as-you-go rate, since Dev/Test only discounts the Windows licence.
              </p>
              <p>
                Spot prices move with capacity and are a point-in-time snapshot. A listed price does not guarantee quota
                or capacity in a region.
              </p>
              {index && currency !== index.baseCurrency && (
                <p>
                  Azure quotes each currency as the {index.baseCurrency} price times one exchange rate it sets monthly,
                  so {currency} figures here are that same conversion and may differ from Azure&apos;s published figure
                  by a rounding step.
                </p>
              )}
            </div>

            <VmCompareTray
              items={comparisonRows.map((row) => ({ sku: row.spec.sku, size: row.spec.size }))}
              maxItems={MAX_COMPARISON}
              onRemove={toggleSelect}
              onClear={() => setSelectedSkus([])}
              onOpen={() => setIsComparisonOpen(true)}
            />

            <VmComparisonDialog
              isOpen={isComparisonOpen && comparisonRows.length >= 2}
              onClose={() => setIsComparisonOpen(false)}
              title={`Comparing ${comparisonRows.length} sizes`}
              subtitle={`${activeRegion?.displayName ?? region} · ${os === 'windows' ? 'Windows' : 'Linux'} · ${getPriceModeLabel(priceMode)} · ${currency}`}
            >
              <VmComparisonPanel
                embedded
                rows={comparisonRows}
                currency={currency}
                os={os}
                priceMode={priceMode}
                display={display}
                hoursPerMonth={hoursPerMonth}
                currencyRate={currencyRate}
                onRemove={toggleSelect}
                onClear={() => setSelectedSkus([])}
              />
            </VmComparisonDialog>
          </>
        )}
      </section>
    </Layout>
  );
}
