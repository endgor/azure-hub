import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from './icons';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);

  // Only render theme-specific content after mounting to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time SSR hydration gate
    setMounted(true);
  }, []);

  // During SSR and initial render, use a neutral state to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-slate-900 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-[#0A84FF]/80 dark:hover:border-[#0A84FF]/30 dark:hover:bg-[#0A84FF]/10 dark:hover:text-[#0A84FF]"
        aria-label="Toggle theme"
      >
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-slate-900 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-[#0A84FF]/80 dark:hover:border-[#0A84FF]/30 dark:hover:bg-[#0A84FF]/10 dark:hover:text-[#0A84FF]"
      onClick={onToggle}
      aria-pressed={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
