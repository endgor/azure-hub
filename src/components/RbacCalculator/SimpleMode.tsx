import { RefObject } from 'react';
import type { Operation } from '@/types/rbac';
import SelectionChips, { type SelectionChip } from '@/components/SelectionChips';
import SearchInput from '@/components/shared/SearchInput';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface SimpleModeProps {
  // Service selection
  serviceSearch: string;
  onServiceSearchChange: (value: string) => void;
  selectedService: string;
  showServiceDropdown: boolean;
  onServiceDropdownVisibilityChange: (visible: boolean) => void;
  isLoadingServices: boolean;
  filteredServices: string[];
  serviceDropdownRef: RefObject<HTMLDivElement | null>;
  onSelectService: (service: string) => void;

  // Action selection
  actionSearch: string;
  onActionSearchChange: (value: string) => void;
  isLoadingActions: boolean;
  availableActions: Operation[];
  filteredActions: Operation[];
  selectedActions: string[];
  selectedActionChips: SelectionChip[];
  onAddAction: (actionName: string) => void;
  onRemoveAction: (actionName: string) => void;
}

/**
 * SimpleMode - Guided UI for selecting Azure service and actions
 *
 * Two-step process:
 * 1. Select an Azure service from dropdown
 * 2. Browse and select specific actions from that service
 */
export default function SimpleMode({
  serviceSearch,
  onServiceSearchChange,
  selectedService,
  showServiceDropdown,
  onServiceDropdownVisibilityChange,
  isLoadingServices,
  filteredServices,
  serviceDropdownRef,
  onSelectService,
  actionSearch,
  onActionSearchChange,
  isLoadingActions,
  availableActions,
  filteredActions,
  selectedActions,
  selectedActionChips,
  onAddAction,
  onRemoveAction,
}: SimpleModeProps) {
  return (
    <>
      <div className="space-y-2 relative" ref={serviceDropdownRef}>
        <label
          htmlFor="service-search"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Step 1: Select Azure Service
        </label>
        <SearchInput
          type="text"
          id="service-search"
          value={serviceSearch}
          onChange={(e) => {
            onServiceSearchChange(e.target.value);
            onServiceDropdownVisibilityChange(true);
          }}
          onFocus={() => onServiceDropdownVisibilityChange(true)}
          placeholder={isLoadingServices ? "Loading services..." : "Search for a service (e.g., Compute, Storage, Network)"}
          disabled={isLoadingServices}
          maxWidth="xl"
          isLoading={isLoadingServices}
        />

          {showServiceDropdown && filteredServices.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 max-h-80 overflow-y-auto">
              {filteredServices.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => onSelectService(service)}
                  className="w-full text-left px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="text-sm text-slate-900 dark:text-slate-100">
                    {service}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showServiceDropdown && serviceSearch && filteredServices.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              No services match &ldquo;{serviceSearch}&rdquo;
            </div>
          )}
      </div>

      {selectedService && (
        <div className="space-y-2">
          <label
            htmlFor="action-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Step 2: Browse and Select Actions
          </label>
          <SearchInput
            type="text"
            id="action-search"
            value={actionSearch}
            onChange={(e) => onActionSearchChange(e.target.value)}
            placeholder="Filter actions (e.g., read, write, delete)"
            maxWidth="full"
            icon={null}
          />

          {isLoadingActions ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredActions.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Available Actions ({filteredActions.length}) - Click to add
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredActions.map((operation) => (
                  <button
                    key={operation.name}
                    type="button"
                    onClick={() => onAddAction(operation.name)}
                    disabled={selectedActions.includes(operation.name)}
                    className="w-full text-left px-4 py-3 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition border-b border-slate-100 dark:border-slate-800 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-mono text-xs text-sky-600 dark:text-sky-400 break-all">
                          {operation.name}
                        </div>
                        {operation.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            {operation.description}
                          </div>
                        )}
                      </div>
                      {selectedActions.includes(operation.name) && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          Added
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {actionSearch ? 'No actions match your filter' : 'No actions available for this service'}
            </div>
          )}

          {availableActions.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
              <strong>Note:</strong> Simple mode only shows actions explicitly defined in roles. Some actions (like bastionHosts) may be covered by wildcards (e.g., <code className="rounded bg-amber-100 px-1 py-0.5 font-mono dark:bg-amber-900/40">Microsoft.Network/*</code>) and won&apos;t appear in this list. Use <strong>Advanced mode</strong> to search for any action.
            </div>
          )}
        </div>
      )}

      <SelectionChips
        heading="Selected Actions"
        items={selectedActionChips}
        onRemove={onRemoveAction}
      />
    </>
  );
}
