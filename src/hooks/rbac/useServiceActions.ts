import { useState, useEffect, useCallback } from 'react';
import type { Operation } from '@/types/rbac';

export interface UseServiceActionsProps {
  loadServices: () => Promise<string[]>;
  loadActions: (service: string) => Promise<Operation[] | string[]>;
  isActive: boolean;
}

export interface UseServiceActionsReturn {
  availableServices: string[];
  availableActions: Operation[];
  selectedService: string;
  serviceSearch: string;
  isLoadingServices: boolean;
  isLoadingActions: boolean;
  setSelectedService: (service: string) => void;
  setServiceSearch: (search: string) => void;
  handleSelectService: (service: string) => void;
  handleServiceSearchChange: (value: string) => void;
  clearServices: () => void;
}

/**
 * Hook for managing service/namespace and action loading.
 * Handles lazy loading of services and actions with search functionality.
 */
export function useServiceActions({
  loadServices,
  loadActions,
  isActive,
}: UseServiceActionsProps): UseServiceActionsReturn {
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<Operation[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  // Load services when mode becomes active
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const load = async () => {
      try {
        setIsLoadingServices(true);
        const services = await loadServices();
        setAvailableServices(services);
      } catch {
        // Services failed to load - UI will show empty list
      } finally {
        setIsLoadingServices(false);
      }
    };

    // Clear services when changing mode
    setAvailableServices([]);
    setSelectedService('');
    setAvailableActions([]);

    load();
  }, [isActive, loadServices]);

  // Load actions when service is selected
  useEffect(() => {
    const load = async () => {
      if (!selectedService) {
        setAvailableActions([]);
        return;
      }

      setIsLoadingActions(true);
      try {
        const actions = await loadActions(selectedService);

        // Normalize to Operation[] format
        const normalizedActions: Operation[] = actions.map((action) => {
          if (typeof action === 'string') {
            return {
              name: action,
              displayName: action.split('/').pop() || action,
              description: '',
              provider: action.split('/')[0] || '',
            };
          }
          return action;
        });

        setAvailableActions(normalizedActions);
      } catch {
        setAvailableActions([]);
      } finally {
        setIsLoadingActions(false);
      }
    };
    load();
  }, [selectedService, loadActions]);

  const handleSelectService = useCallback((service: string) => {
    setSelectedService(service);
    setServiceSearch(service);
  }, []);

  const handleServiceSearchChange = useCallback((value: string) => {
    setServiceSearch(value);
    if (value !== selectedService) {
      setSelectedService('');
      setAvailableActions([]);
    }
  }, [selectedService]);

  const clearServices = useCallback(() => {
    setAvailableActions([]);
    setSelectedService('');
    setServiceSearch('');
  }, []);

  return {
    availableServices,
    availableActions,
    selectedService,
    serviceSearch,
    isLoadingServices,
    isLoadingActions,
    setSelectedService,
    setServiceSearch,
    handleSelectService,
    handleServiceSearchChange,
    clearServices,
  };
}
