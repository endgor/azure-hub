import type { CustomRoleDefinition } from '@/hooks/useRoleCreator';
import type { RbacTemplate } from '@/lib/rbacTemplates';
import ScopesManager from '@/components/ScopesManager';
import TemplateSelector from '@/components/TemplateSelector';

interface RoleInformationSectionProps {
  customRole: CustomRoleDefinition;
  onRoleNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onAddScope: (scope: string) => void;
  onRemoveScope: (scope: string) => void;
  onLoadTemplate: (template: RbacTemplate) => void;
}

export default function RoleInformationSection({
  customRole,
  onRoleNameChange,
  onDescriptionChange,
  onAddScope,
  onRemoveScope,
  onLoadTemplate,
}: RoleInformationSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Role Information
        </h2>
        <TemplateSelector onLoadTemplate={onLoadTemplate} />
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="role-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Role Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="role-name"
            value={customRole.roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            placeholder="My Custom Role"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label htmlFor="role-description" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Description
          </label>
          <textarea
            id="role-description"
            value={customRole.description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe what this role can do..."
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>

        <ScopesManager
          scopes={customRole.assignableScopes}
          onAdd={onAddScope}
          onRemove={onRemoveScope}
        />
      </div>
    </div>
  );
}
