import type { CustomRoleDefinition } from '@/hooks/useRoleCreator';
import type { RbacTemplate } from '@/lib/rbacTemplates';
import ScopesManager from '@/components/ScopesManager';
import TemplateSelector from '@/components/TemplateSelector';
import { inputClass, textareaClass } from '@/components/shared/inputStyles';

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
            className={inputClass}
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
            className={textareaClass}
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
