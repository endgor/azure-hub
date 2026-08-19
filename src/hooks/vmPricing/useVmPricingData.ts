import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadPricingIndex,
  loadRegionPrices,
  loadSkuCatalog
} from '@/lib/vmPricing/clientVmPricingService';
import type { VmPricingIndex, VmRegionPrices, VmSkuCatalog, VmSkuSpec } from '@/types/vmPricing';

interface UseVmPricingDataResult {
  index: VmPricingIndex | null;
  catalog: VmSkuCatalog | null;
  regionPrices: VmRegionPrices | null;
  skuLookup: Map<string, VmSkuSpec>;
  isLoadingCatalogue: boolean;
  isLoadingPrices: boolean;
  /** Fatal: without the catalogue or index there is nothing to render. */
  catalogueError: string | null;
  /** Recoverable: the controls stay usable so another region can be picked. */
  priceError: string | null;
  retry: () => void;
}

export function useVmPricingData(region: string | null): UseVmPricingDataResult {
  const [index, setIndex] = useState<VmPricingIndex | null>(null);
  const [catalog, setCatalog] = useState<VmSkuCatalog | null>(null);
  const [regionPrices, setRegionPrices] = useState<VmRegionPrices | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setCatalogueError(null);
        const [loadedIndex, loadedCatalog] = await Promise.all([loadPricingIndex(), loadSkuCatalog()]);
        if (cancelled) return;
        setIndex(loadedIndex);
        setCatalog(loadedCatalog);
      } catch (loadError) {
        if (!cancelled) {
          setCatalogueError(loadError instanceof Error ? loadError.message : 'Failed to load VM pricing data.');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!region) return;

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoadingPrices(true);
        setPriceError(null);
        const prices = await loadRegionPrices(region);
        if (!cancelled) setRegionPrices(prices);
      } catch (loadError) {
        if (!cancelled) {
          setRegionPrices(null);
          setPriceError(loadError instanceof Error ? loadError.message : `Failed to load prices for ${region}.`);
        }
      } finally {
        if (!cancelled) setIsLoadingPrices(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [region, attempt]);

  const skuLookup = useMemo(
    () => new Map((catalog?.skus ?? []).map((sku) => [sku.sku, sku])),
    [catalog]
  );

  return {
    index,
    catalog,
    regionPrices,
    skuLookup,
    isLoadingCatalogue: !index || !catalog,
    isLoadingPrices,
    catalogueError,
    priceError,
    retry
  };
}
