import { useState, useCallback } from 'react';

export type RbacMode = 'simple' | 'advanced' | 'roleExplorer' | 'roleCreator';

export interface UseRbacModeProps {
  initialMode?: RbacMode;
  supportedModes?: RbacMode[];
}

export interface UseRbacModeReturn {
  mode: RbacMode;
  setMode: (mode: RbacMode) => void;
  isSimpleMode: boolean;
  isAdvancedMode: boolean;
  isRoleExplorerMode: boolean;
  isRoleCreatorMode: boolean;
}

/**
 * Hook for managing RBAC calculator modes.
 * Provides state and helpers for switching between different input modes.
 */
export function useRbacMode({
  initialMode = 'simple',
  supportedModes,
}: UseRbacModeProps = {}): UseRbacModeReturn {
  const [mode, setModeInternal] = useState<RbacMode>(initialMode);

  const setMode = useCallback((newMode: RbacMode) => {
    if (supportedModes && !supportedModes.includes(newMode)) {
      setModeInternal('simple');
      return;
    }
    setModeInternal(newMode);
  }, [supportedModes]);

  return {
    mode,
    setMode,
    isSimpleMode: mode === 'simple',
    isAdvancedMode: mode === 'advanced',
    isRoleExplorerMode: mode === 'roleExplorer',
    isRoleCreatorMode: mode === 'roleCreator',
  };
}
