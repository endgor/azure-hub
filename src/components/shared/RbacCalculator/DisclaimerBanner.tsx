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
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-400/30 dark:bg-sky-500/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200 mb-2">
            Important Information
          </h3>
          <p className="text-sm text-sky-800 dark:text-sky-200 mb-3">
            {config.disclaimer.description}
          </p>
          <p>
            <strong>Please note:</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sky-800 dark:text-sky-200">
            {config.disclaimer.points.map((point, index) => (
              <li key={index}>
                {point.startsWith('⚠️') ? (
                  <strong>{point}</strong>
                ) : (
                  point
                )}
              </li>
            ))}
          </ul>
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
