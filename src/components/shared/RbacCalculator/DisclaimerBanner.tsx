import type { RoleSystemConfig } from '@/lib/rbacConfig';

interface DisclaimerBannerProps {
  /** Configuration for role system-specific disclaimer content */
  config: RoleSystemConfig;

  onDismiss: () => void;
}

/**
 * DisclaimerBanner - Important information about the RBAC Calculator
 *
 * Config-driven component that displays role system-specific disclaimer content.
 * Displays disclaimer about tool limitations and best practices.
 * Can be dismissed and preference is stored in localStorage.
 */
export default function DisclaimerBanner({ config, onDismiss }: DisclaimerBannerProps) {
  const importantPoint = config.disclaimer.points.find(point => point.startsWith('⚠️'));
  const additionalPoints = config.disclaimer.points.filter(point => point !== importantPoint);

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-400/30 dark:bg-sky-500/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200">
            Important Information
          </h3>
          <p className="text-sm text-sky-800 dark:text-sky-200">
            {config.disclaimer.description}
          </p>

          {importantPoint && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              {importantPoint}
            </p>
          )}

          {additionalPoints.length > 0 && (
            <details className="group rounded-lg border border-sky-200/80 bg-white/60 dark:border-sky-400/20 dark:bg-slate-900/30">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-sky-900 dark:text-sky-200">
                Show full guidance
              </summary>
              <div className="border-t border-sky-200/80 px-3 py-2 dark:border-sky-400/20">
                <ul className="list-disc space-y-1 pl-5 text-sm text-sky-800 dark:text-sky-200">
                  {additionalPoints.map((point, index) => (
                    <li key={`${point}-${index}`}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
          aria-label="Dismiss disclaimer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
