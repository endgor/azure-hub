/**
 * Shared input style constants for consistent text field styling across the app.
 *
 * Use these for any <input> or <textarea> that isn't wrapped in a dedicated
 * component like SearchInput. They match SearchInput's flat, borderless look.
 */

/** Base classes shared by all input types */
const base =
  'w-full rounded-xl border border-slate-400 bg-white text-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400';

/** Standard text input */
export const inputClass = `${base} px-4 py-2.5`;

/** Textarea */
export const textareaClass = `${base} px-4 py-2.5`;

/** Input with a right-side element (icon, button) — extra right padding */
export const inputWithIconClass = `${base} px-4 py-2.5 pr-12`;
