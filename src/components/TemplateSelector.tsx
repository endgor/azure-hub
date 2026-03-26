import { useState } from 'react';
import { RBAC_TEMPLATES, getTemplateCategories, type RbacTemplate } from '@/lib/rbacTemplates';

interface TemplateSelectorProps {
  onLoadTemplate: (template: RbacTemplate) => void;
}

/**
 * Compact template selector — renders as a small icon button with a dropdown.
 * Designed to sit in a header row (e.g., top-right of Role Information).
 */
export default function TemplateSelector({ onLoadTemplate }: TemplateSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-label="Load template"
        title="Load from template"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 z-20 mt-1 w-[420px] rounded-lg bg-white shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Load a template to pre-fill permissions</p>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {getTemplateCategories().map((category) => {
                const templates = RBAC_TEMPLATES.filter(t => t.category === category);
                return (
                  <div key={category}>
                    <div className="bg-slate-50 px-3 py-1.5 dark:bg-slate-700/50">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {category}
                      </h4>
                    </div>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          onLoadTemplate(template);
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              {template.name}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {template.description}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {template.actions.length}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
