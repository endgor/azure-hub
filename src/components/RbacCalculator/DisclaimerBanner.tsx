interface DisclaimerBannerProps {
  onDismiss: () => void;
}

/**
 * DisclaimerBanner - Important information about the RBAC Calculator
 *
 * Displays disclaimer about tool limitations and best practices.
 * Can be dismissed and preference is stored in localStorage.
 */
export default function DisclaimerBanner({ onDismiss }: DisclaimerBannerProps) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-400/30 dark:bg-sky-500/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200 mb-2">
            Important Information
          </h3>
          <p className="text-sm text-sky-800 dark:text-sky-200 mb-3">
            This tool helps you find <strong>built-in roles</strong> in Azure that provide the least privilege for a specific set of actions. It searches through Azure&apos;s built-in role definitions and ranks them by relevance to your required permissions.
          </p>
          <p>
            <strong>Please note:</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Only <strong>built-in roles</strong> are searched. Some services may require <strong>custom roles</strong> for specific permission combinations.</li>
            <li>Role ranking is based on namespace relevance and permission scope, not on risk assessment or privilege level beyond basic categorization.</li>
            <li>Some permissions may not be available in any built-in role. In such cases, you&apos;ll need to create a custom role.</li>
            <li>Always review the full list of permissions granted by a role before assignment to ensure it meets your security requirements.</li>
            <li><strong>⚠️ Important:</strong> Always verify the results and test role assignments in a non-production environment before deploying to production. You are using this tool at your own risk.</li>
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
