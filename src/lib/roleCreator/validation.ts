/**
 * Validation utilities for Azure RBAC role creation
 */

export interface ActionValidation {
  isValid: boolean;
  suggestion?: string;
}

/**
 * Check if an action contains a wildcard character
 */
export function hasWildcard(action: string): boolean {
  return action.includes('*');
}

/**
 * Validate if an action is likely misclassified between control and data plane.
 * DataActions typically involve data access operations (e.g., blob read/write, queue messages).
 * Actions are control plane operations (e.g., resource management).
 */
export function validateActionCategory(
  action: string,
  category: 'actions' | 'dataActions'
): ActionValidation {
  const isLikelyDataAction = action.includes('/blobs/') ||
                             action.includes('/containers/') ||
                             action.includes('/messages/') ||
                             action.includes('/files/') ||
                             action.includes('/fileshares/') ||
                             action.includes('/queues/') ||
                             action.includes('/tables/');

  if (category === 'dataActions' && !isLikelyDataAction) {
    return {
      isValid: false,
      suggestion: 'This looks like a control plane action. Consider moving to "actions".'
    };
  }

  if (category === 'actions' && isLikelyDataAction) {
    return {
      isValid: false,
      suggestion: 'This looks like a data plane action. Consider moving to "dataActions".'
    };
  }

  return { isValid: true };
}

/**
 * Check if assignable scopes contain placeholder subscription IDs
 */
export function hasPlaceholderScope(scopes: string[]): boolean {
  return scopes.some(scope => scope.includes('00000000-0000-0000-0000-000000000000'));
}

/**
 * Find validation issues in manually added actions
 */
export function findValidationIssues(
  actions: string[],
  dataActions: string[],
  manuallyAddedActions: Set<string>
): string[] {
  const validationIssues: string[] = [];

  actions.forEach(action => {
    if (manuallyAddedActions.has(action)) {
      const validation = validateActionCategory(action, 'actions');
      if (!validation.isValid) {
        validationIssues.push(`"${action}" in actions might be misclassified`);
      }
    }
  });

  dataActions.forEach(action => {
    if (manuallyAddedActions.has(action)) {
      const validation = validateActionCategory(action, 'dataActions');
      if (!validation.isValid) {
        validationIssues.push(`"${action}" in dataActions might be misclassified`);
      }
    }
  });

  return validationIssues;
}
