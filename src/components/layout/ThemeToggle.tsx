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
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        aria-label="Toggle theme"
      >
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      onClick={onToggle}
      aria-pressed={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
