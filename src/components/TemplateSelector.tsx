import { useState } from 'react';
import { RBAC_TEMPLATES, getTemplateCategories, type RbacTemplate } from '@/lib/rbacTemplates';
import { useLocalStorageBoolean } from '@/hooks/useLocalStorageState';

interface TemplateSelectorProps {
  onLoadTemplate: (template: RbacTemplate) => void;
}

export default function TemplateSelector({ onLoadTemplate }: TemplateSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBanner, setShowBanner] = useLocalStorageBoolean('rbac-template-banner-dismissed', true);

  const handleDismiss = () => {
    setShowBanner(false);
  };

  const handleShow = () => {
    setShowBanner(true);
  };

  if (!showBanner) {
    return (
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleShow}
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Show Role Templates
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-teal-950/30">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
        aria-label="Dismiss templates"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-start justify-between gap-4 pr-8">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Quick Start Templates
            </h3>
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Load predefined permission sets for common Azure scenarios that don&apos;t have dedicated built-in roles.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Load Template
            <svg className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 z-20 mt-2 w-[500px] rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-[600px] overflow-y-auto">
                {getTemplateCategories().map((category) => {
                  const templates = RBAC_TEMPLATES.filter(t => t.category === category);
                  return (
                    <div key={category} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="bg-slate-50 px-4 py-2 dark:bg-slate-800/50">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
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
                          className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-0 dark:border-slate-800 dark:hover:bg-sky-900/20"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-medium text-slate-900 dark:text-slate-100">
                                {template.name}
                              </h5>
                              <span className="shrink-0 text-xs font-medium text-sky-600 dark:text-sky-400">
                                {template.actions.length} actions
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {template.description}
                            </p>
                            {template.notes && (
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                <strong>Note:</strong> {template.notes}
                              </p>
                            )}
                            {template.sourceUrl && (
                              <a
                                href={template.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Microsoft docs
                              </a>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
