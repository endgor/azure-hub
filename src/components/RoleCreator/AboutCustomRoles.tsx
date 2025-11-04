/**
 * About Custom Roles - Educational information about Azure custom roles
 *
 * Displays important information about custom role permissions and best practices.
 */
export default function AboutCustomRoles() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/30 dark:bg-blue-500/10">
      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
        About Custom Roles
      </h3>
      <ul className="list-disc space-y-2 pl-5 text-sm text-blue-800 dark:text-blue-200">
        <li><strong>Actions</strong>: Control plane operations (management operations)</li>
        <li><strong>NotActions</strong>: Exclude specific actions from a wildcard grant</li>
        <li><strong>DataActions</strong>: Data plane operations (data access)</li>
        <li><strong>NotDataActions</strong>: Exclude specific data actions</li>
        <li>
          <span className="inline-flex items-center gap-1">
            Wildcards <span className="text-amber-600 dark:text-amber-400">⚠️</span> like <code className="rounded bg-blue-100 px-1 py-0.5 font-mono dark:bg-blue-900/40">Microsoft.Storage/*</code> grant broader permissions - use with caution
          </span>
        </li>
        <li>The exported JSON can be used with Azure CLI, PowerShell, or ARM templates to create the custom role</li>
        <li><strong>⚠️ Important:</strong> Always verify the generated role definition and test it in a non-production environment before deploying to production. You are using this tool at your own risk.</li>
      </ul>
    </div>
  );
}
