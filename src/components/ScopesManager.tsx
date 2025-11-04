import { useState } from 'react';
import Button from '@/components/shared/Button';

interface ScopesManagerProps {
  scopes: string[];
  onAdd: (scope: string) => void;
  onRemove: (scope: string) => void;
}

export default function ScopesManager({ scopes, onAdd, onRemove }: ScopesManagerProps) {
  const [input, setInput] = useState('');
  const [showWarning, setShowWarning] = useState(true);

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  const hasPlaceholder = scopes.some(scope => scope.includes('00000000-0000-0000-0000-000000000000'));

  return (
    <div>
      <label htmlFor="assignable-scopes" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
        Assignable Scopes <span className="text-rose-500">*</span>
      </label>

      {/* Info Banner */}
      {showWarning && hasPlaceholder && (
        <div className="relative mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 pr-10 text-xs text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowWarning(false)}
            className="absolute right-2 top-2 rounded-lg p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30"
            aria-label="Dismiss warning"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
          <p className="font-semibold mb-1">⚠️ Required: Replace the placeholder subscription ID</p>
          <p className="mb-2">Azure Portal requires valid assignable scopes to save your custom role. Update the placeholder with your actual subscription ID(s).</p>
          <div className="space-y-1 font-mono text-xs">
            <p className="text-blue-700 dark:text-blue-300">Valid scope formats:</p>
            <p>• /subscriptions/{'{subscriptionId}'}</p>
            <p>• /subscriptions/{'{subscriptionId}'}/resourceGroups/{'{resourceGroup}'}</p>
            <p>• /providers/Microsoft.Management/managementGroups/{'{groupId}'}</p>
          </div>
        </div>
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
