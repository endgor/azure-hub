import { useCallback } from 'react';

const PLACEHOLDER_SCOPE = '/subscriptions/00000000-0000-0000-0000-000000000000';

export interface UseScopeManagementProps {
  scopes: string[];
  onScopesChange: (scopes: string[]) => void;
}

export interface UseScopeManagementReturn {
  handleAddScope: (scope: string) => void;
  handleRemoveScope: (scope: string) => void;
  hasPlaceholder: boolean;
}

/**
 * Hook for managing assignable scopes in a custom role.
 * Handles adding/removing scopes with placeholder management.
 */
export function useScopeManagement({
  scopes,
  onScopesChange
}: UseScopeManagementProps): UseScopeManagementReturn {

  // Add assignable scope
  const handleAddScope = useCallback((scope: string) => {
    if (scope && !scopes.includes(scope)) {
      // Remove placeholder if it exists when adding a real scope
      const newScopes = scopes.filter(
        s => !s.includes('00000000-0000-0000-0000-000000000000')
      );
      onScopesChange([...newScopes, scope]);
    }
  }, [scopes, onScopesChange]);

  // Remove assignable scope
  const handleRemoveScope = useCallback((scope: string) => {
    const newScopes = scopes.filter(s => s !== scope);

    // If no scopes remain, add back the placeholder
    if (newScopes.length === 0) {
      onScopesChange([PLACEHOLDER_SCOPE]);
    } else {
      onScopesChange(newScopes);
    }
  }, [scopes, onScopesChange]);

  const hasPlaceholder = scopes.some(scope => scope.includes('00000000-0000-0000-0000-000000000000'));

  return {
    handleAddScope,
    handleRemoveScope,
    hasPlaceholder,
  };
}
