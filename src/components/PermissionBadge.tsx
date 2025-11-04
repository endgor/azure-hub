import Button from '@/components/shared/Button';

interface ValidationResult {
  isValid: boolean;
  suggestion?: string;
}

interface PermissionBadgeProps {
  action: string;
  hasWildcard?: boolean;
  validation?: ValidationResult;
  onMove?: () => void;
  onRemove: () => void;
  showMoveButton?: boolean;
}

export default function PermissionBadge({
  action,
  hasWildcard = false,
  validation = { isValid: true },
  onMove,
  onRemove,
  showMoveButton = true
}: PermissionBadgeProps) {
  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-md border px-3 py-2 ${
          hasWildcard
            ? 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasWildcard && (
            <span
              className="shrink-0 text-amber-600 dark:text-amber-400 cursor-help"
              title="Wildcard permission: Grants broader access to multiple operations. Use with caution as it may grant more permissions than needed."
            >
              ⚠️
            </span>
          )}
          <span className={`font-mono text-xs break-all ${
            hasWildcard
              ? 'text-amber-800 dark:text-amber-300'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {action}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {!validation.isValid && showMoveButton && onMove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMove}
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
              title={validation.suggestion}
            >
              Move
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-0"
            aria-label={`Remove ${action}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>
      {!validation.isValid && validation.suggestion && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 pl-3">
          💡 {validation.suggestion}
        </div>
      )}
    </div>
  );
}
