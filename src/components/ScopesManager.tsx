import { useState } from 'react';
import Button from '@/components/shared/Button';

interface ScopesManagerProps {
  scopes: string[];
  onAdd: (scope: string) => void;
  onRemove: (scope: string) => void;
}

export default function ScopesManager({ scopes, onAdd, onRemove }: ScopesManagerProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  const hasPlaceholder = scopes.some(scope => scope.includes('00000000-0000-0000-0000-000000000000'));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label htmlFor="assignable-scopes" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Assignable Scopes <span className="text-rose-500">*</span>
        </label>
        <div className="group relative inline-flex">
          <button
            type="button"
            aria-label="Scope format help"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-sky-300"
          >
            i
          </button>
          <div
            role="tooltip"
            className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Valid scope formats
            </p>
            <ul className="mt-2 space-y-1 font-mono">
              <li className="break-all">/subscriptions/{'{subscriptionId}'}</li>
              <li className="break-all">/subscriptions/{'{subscriptionId}'}/resourceGroups/{'{resourceGroup}'}</li>
              <li className="break-all">/providers/Microsoft.Management/managementGroups/{'{groupId}'}</li>
            </ul>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Use real IDs. Placeholder values cannot be saved in Azure Portal.
            </p>
          </div>
        </div>
      </div>

      {hasPlaceholder && (
        <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          ⚠️ Replace the placeholder subscription ID before exporting or assigning this role.
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          id="assignable-scopes"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="/subscriptions/{subscriptionId}"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <Button
          type="button"
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>

      {scopes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {scopes.map((scope) => {
            const isPlaceholder = scope.includes('00000000-0000-0000-0000-000000000000');
            return (
              <div
                key={scope}
                className={`flex items-center gap-2 rounded-md border px-3 py-1 ${
                  isPlaceholder
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                {isPlaceholder && (
                  <span
                    className="text-amber-600 dark:text-amber-400 cursor-help"
                    title="This is a placeholder. Replace with your actual subscription ID."
                  >
                    ⚠️
                  </span>
                )}
                <span className={`font-mono text-xs ${
                  isPlaceholder
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {scope}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(scope)}
                  className={
                    isPlaceholder
                      ? 'text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-0'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-0'
                  }
                  aria-label={`Remove ${scope}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
