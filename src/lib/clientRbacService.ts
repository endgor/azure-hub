import { AzureRole, Operation, LeastPrivilegeInput, LeastPrivilegeResult } from '@/types/rbac';
import { CACHE_TTL_MS, SEARCH } from '@/config/constants';

let rolesCache: AzureRole[] | null = null;
let rolesCacheExpiry = 0;

let actionSetsCache: {
  controlActions: Set<string>;
  dataActions: Set<string>;
  dataActionPrefixes: Set<string>;
  expiry: number;
} | null = null;

interface ApiResponseBase {
  error?: string;
}

interface SearchOperationsResponse extends ApiResponseBase {
  operations: Operation[];
}

interface CalculateLeastPrivilegeResponse extends ApiResponseBase {
  results: LeastPrivilegeResult[];
}

interface ServiceNamespacesResponse extends ApiResponseBase {
  namespaces: string[];
}

interface ActionsByServiceResponse extends ApiResponseBase {
  operations: Operation[];
}

async function fetchApiJson<T extends ApiResponseBase>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  let payload: T | null = null;
  try {
    payload = await response.json() as T;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload || {}) as T;
}

export async function loadRoleDefinitions(): Promise<AzureRole[]> {
  const now = Date.now();

  if (rolesCache && rolesCacheExpiry > now) {
    return rolesCache;
  }

  const response = await fetch('/data/roles-extended.json');
  if (!response.ok) {
    throw new Error(`Failed to load role definitions: ${response.statusText}`);
  }

  const roles = await response.json() as AzureRole[];
  rolesCache = roles;
  rolesCacheExpiry = now + CACHE_TTL_MS;

  return roles;
}

export async function searchOperations(query: string): Promise<Operation[]> {
  if (!query || query.trim().length < SEARCH.MIN_QUERY_LENGTH) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const payload = await fetchApiJson<SearchOperationsResponse>(
    `/api/rbac/searchOperations?query=${encodedQuery}&limit=100`
  );

  return payload.operations || [];
}

export async function getServiceNamespaces(): Promise<string[]> {
  const payload = await fetchApiJson<ServiceNamespacesResponse>('/api/rbac/namespaces');
  return payload.namespaces || [];
}

export async function getActionsByService(serviceNamespace: string): Promise<Operation[]> {
  if (!serviceNamespace.trim()) {
    return [];
  }

  const encodedService = encodeURIComponent(serviceNamespace.trim());
  const payload = await fetchApiJson<ActionsByServiceResponse>(
    `/api/rbac/actionsByService?service=${encodedService}`
  );

  return payload.operations || [];
}

export async function calculateLeastPrivilege(input: LeastPrivilegeInput): Promise<LeastPrivilegeResult[]> {
  const payload = await fetchApiJson<CalculateLeastPrivilegeResponse>('/api/rbac/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requiredActions: input.requiredActions,
      requiredDataActions: input.requiredDataActions || []
    }),
  });

  return payload.results || [];
}

async function getKnownActionSets(): Promise<{
  controlActions: Set<string>;
  dataActions: Set<string>;
  dataActionPrefixes: Set<string>;
}> {
  const now = Date.now();
  if (actionSetsCache && actionSetsCache.expiry > now) {
    return actionSetsCache;
  }

  const roles = await loadRoleDefinitions();
  const controlActions = new Set<string>();
  const dataActions = new Set<string>();

  for (const role of roles) {
    for (const permission of role.permissions) {
      for (const action of permission.actions) {
        if (!action.includes('*')) {
          controlActions.add(action.toLowerCase());
        }
      }
      if (permission.dataActions) {
        for (const dataAction of permission.dataActions) {
          if (!dataAction.includes('*')) {
            dataActions.add(dataAction.toLowerCase());
          }
        }
      }
    }
  }

  const dataActionPrefixes = new Set<string>();
  for (const dataAction of dataActions) {
    const lastSlash = dataAction.lastIndexOf('/');
    if (lastSlash > 0) {
      dataActionPrefixes.add(dataAction.substring(0, lastSlash + 1));
    }
  }

  actionSetsCache = {
    controlActions,
    dataActions,
    dataActionPrefixes,
    expiry: now + CACHE_TTL_MS,
  };

  return actionSetsCache;
}

export async function classifyActions(actions: string[]): Promise<{ controlActions: string[]; dataActions: string[] }> {
  const { dataActions: knownDataActions, dataActionPrefixes } = await getKnownActionSets();

  const controlActions: string[] = [];
  const dataActions: string[] = [];

  for (const action of actions) {
    const actionLower = action.toLowerCase();

    if (knownDataActions.has(actionLower)) {
      dataActions.push(action);
      continue;
    }

    if (action.includes('*')) {
      const prefix = actionLower.replace(/\*.*$/, '');
      const isDataAction = [...dataActionPrefixes].some((dataPrefix) =>
        dataPrefix.startsWith(prefix) || prefix.startsWith(dataPrefix)
      );

      if (isDataAction) {
        dataActions.push(action);
      } else {
        controlActions.push(action);
      }

      continue;
    }

    controlActions.push(action);
  }

  return { controlActions, dataActions };
}

export async function preloadActionsCache(): Promise<void> {
  try {
    await getServiceNamespaces();
  } catch {
    // Silently fail - on-demand requests will retry.
  }
}
