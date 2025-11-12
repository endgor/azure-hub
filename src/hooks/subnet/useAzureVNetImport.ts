import { useState, useEffect, useRef } from 'react';

export interface UseAzureVNetImportReturn {
  isAzureMenuOpen: boolean;
  setIsAzureMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  azureMenuRef: React.RefObject<HTMLDivElement | null>;
  useAzureReservations: boolean;
  setUseAzureReservations: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Hook for managing Azure VNet import modal and Azure-specific settings.
 * Handles menu state, outside click detection, and Azure reservations toggle.
 */
export function useAzureVNetImport(): UseAzureVNetImportReturn {
  const [isAzureMenuOpen, setIsAzureMenuOpen] = useState(false);
  const [useAzureReservations, setUseAzureReservations] = useState(true);
  const azureMenuRef = useRef<HTMLDivElement | null>(null);

  // Handle outside clicks to close menu
  useEffect(() => {
    if (!isAzureMenuOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!azureMenuRef.current) {
        return;
      }
      if (!azureMenuRef.current.contains(event.target as Node)) {
        setIsAzureMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isAzureMenuOpen]);

  return {
    isAzureMenuOpen,
    setIsAzureMenuOpen,
    azureMenuRef,
    useAzureReservations,
    setUseAzureReservations
  };
}
