import { useId, useState } from 'react';
import type { RoleSystemConfig } from '@/lib/rbacConfig';

function splitPoints(config: RoleSystemConfig) {
  const warning = config.disclaimer.points.find(point => point.startsWith('⚠️'));
  const points = config.disclaimer.points.filter(point => point !== warning);
  return { warning: warning?.replace(/^⚠️\s*(Important:\s*)?/, ''), points };
}

function InfoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
    </svg>
  );
}

function DetailsBody({ config }: { config: RoleSystemConfig }) {
  const { warning, points } = splitPoints(config);
  return (
    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <p>{config.disclaimer.description}</p>
      {warning && <p className="font-medium text-amber-700 dark:text-amber-300">⚠️ {warning}</p>}
      <ul className="list-disc space-y-1 pl-5">
        {points.map(point => <li key={point}>{point}</li>)}
      </ul>
    </div>
  );
}

/**
 * Page title with an info button that reveals the calculator's limitations.
 * Replaces the old dismissible banner so the guidance is always one tap away.
 */
export function TitleWithInfo({ title, config }: { title: string; config: RoleSystemConfig }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl lg:text-3xl">
        {title}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="About this calculator and its limitations"
          className={`ml-2 inline-flex translate-y-[-2px] items-center justify-center rounded-full p-1 align-middle transition ${
            open ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300' : 'text-slate-400 hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-400'
          }`}
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      </h1>
      {open && (
        <div id={panelId} className="relative max-w-3xl rounded-xl border border-slate-200 bg-white p-4 pr-10 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <DetailsBody config={config} />
        </div>
      )}
    </>
  );
}

/** One-line caution shown above recommended roles, where users act on the results. */
export function ResultsCaution() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300/90">
      <span aria-hidden="true">⚠️</span>
      <span>Verify roles in a non-production environment before assigning them. Use at your own risk.</span>
    </p>
  );
}
