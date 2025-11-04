import { RefObject } from 'react';
import type { Operation } from '@/types/rbac';
import ActionSuggestionList from '@/components/ActionSuggestionList';

interface AdvancedModeProps {
  actionsInput: string;
  onActionsInputChange: (value: string) => void;
  searchResults: Operation[];
  advancedSearchDropdownRef: RefObject<HTMLDivElement | null>;
  onAddAction: (actionName: string) => void;
}

/**
 * AdvancedMode - Free-form text input for Azure actions
 *
 * Allows entering multiple actions (one per line) with:
 * - Wildcard support (e.g., Microsoft.Storage/*)
 * - Comment lines starting with #
 * - Action suggestions as you type
 */
export default function AdvancedMode({
  actionsInput,
  onActionsInputChange,
  searchResults,
  advancedSearchDropdownRef,
  onAddAction,
}: AdvancedModeProps) {
  return (
    <>
      <div className="space-y-2" ref={advancedSearchDropdownRef}>
        <label
          htmlFor="actions"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Required Actions <span className="text-slate-500">(one per line)</span>
        </label>
        <textarea
          id="actions"
          value={actionsInput}
          onChange={(e) => onActionsInputChange(e.target.value)}
          placeholder={'Microsoft.Compute/virtualMachines/read\nMicrosoft.Compute/virtualMachines/start/action\nMicrosoft.Compute/virtualMachines/restart/action'}
          rows={8}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supports wildcards (e.g., Microsoft.Storage/ *). Lines starting with # are treated as comments.
        </p>
      </div>

      {searchResults.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Suggested Actions
            </p>
          </div>
          <ActionSuggestionList
            suggestions={searchResults.map((operation) => ({
              id: operation.name,
              name: operation.name,
              detail: operation.displayName || undefined
            }))}
            onSelect={onAddAction}
          />
        </div>
      )}
    </>
  );
}
