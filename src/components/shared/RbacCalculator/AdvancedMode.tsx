import { RefObject } from 'react';
import type { Operation } from '@/types/rbac';
import type { RoleSystemConfig } from '@/lib/rbacConfig';
import ActionSuggestionList from '@/components/ActionSuggestionList';

interface AdvancedModeProps {
  config: RoleSystemConfig;
  actionsInput: string;
  onActionsInputChange: (value: string) => void;
  searchResults: Operation[];
  advancedSearchDropdownRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onAddAction: (actionName: string) => void;
}

export default function AdvancedMode({
  config,
  actionsInput,
  onActionsInputChange,
  searchResults,
  advancedSearchDropdownRef,
  textareaRef,
  onAddAction,
}: AdvancedModeProps) {
  const isAzure = config.systemType === 'azure';

  return (
    <div ref={advancedSearchDropdownRef}>
      <div className="space-y-2">
        <label
          htmlFor="actions"
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Required {config.labels.actionLabel} <span className="text-slate-500">(one per line)</span>
        </label>
        <textarea
          ref={textareaRef}
          id="actions"
          value={actionsInput}
          onChange={(e) => onActionsInputChange(e.target.value)}
          placeholder={config.placeholders.advancedMode}
          rows={8}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-xs text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supports wildcards (e.g., {config.placeholders.wildcardExample}). Lines starting with # are treated as comments.
        </p>
      </div>

      {searchResults.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Suggested {config.labels.actionLabel}
            </p>
          </div>
          <ActionSuggestionList
            suggestions={searchResults.map((operation) => ({
              id: `${operation.name}-${operation.planeType || 'control'}`,
              name: operation.name,
              detail: operation.displayName || undefined,
              planeType: operation.planeType
            }))}
            onSelect={onAddAction}
            showPlaneType={isAzure}
          />
        </div>
      )}
    </div>
  );
}
