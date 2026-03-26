import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ICONS, type IconKey } from './icons';

export interface NavItem {
  label: string;

  href: string;
  icon: IconKey;
  comingSoon?: boolean;
  disabled?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  matchRoute: (href: string) => boolean;
  navSections: NavSection[];
}

export function Sidebar({
  isMobileMenuOpen,
  onMobileMenuClose,
  matchRoute,
  navSections
}: SidebarProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <>
      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={onMobileMenuClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r border-slate-200 bg-[#F3F4F6]/95 backdrop-blur transition-all duration-200 ease-out dark:border-[#363638] dark:bg-[#1B1B1C]/95 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 md:relative' : 'hidden md:flex'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Azure Hub home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-[#1B1B1C]">
              <Image
                src="/favicons/favicon-32x32.png"
                alt="Azure Hub logo"
                width={24}
                height={24}
                priority
                unoptimized
              />
            </span>
            <span className={`text-lg font-semibold tracking-tight ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
              Azure Hub
            </span>
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 dark:border-[#363638] dark:bg-[#2C2C2E] dark:text-slate-200 dark:hover:border-[#363638] dark:hover:text-slate-100"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-pressed={isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <span className="sr-only">{isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5 text-current"
            >
              {isSidebarCollapsed ? (
                <path
                  fill="currentColor"
                  d="M9.3 7.3a1 1 0 011.4 0L15 11.6a1 1 0 01.03 1.35l-.03.03-4.3 4.3a1 1 0 01-1.5-1.32l.1-.11L12.58 12l-3.28-3.29a1 1 0 010-1.41z"
                />
              ) : (
                <path
                  fill="currentColor"
                  d="M14.7 7.3a1 1 0 010 1.4L11.41 12l3.3 3.29a1 1 0 01-1.32 1.5l-.11-.1-4.3-4.3a1 1 0 01-.03-1.35l.03-.03 4.3-4.3a1 1 0 011.41 0z"
                />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
          {navSections.flatMap((section) => section.items).map((item) => {
            const active = matchRoute(item.href);
            const disabled = item.disabled;
            const baseClasses =
              'group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
            const stateClasses = disabled
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
              : active
              ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200';

            return (
              <Link
                key={item.label}
                href={disabled ? '#' : item.href}
                className={`${baseClasses} ${stateClasses}`}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : undefined}
                onClick={(event) => {
                  if (disabled) {
                    event.preventDefault();
                  }
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                >
                  {ICONS[item.icon](active)}
                </span>
                <span className={`${isSidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
                {item.comingSoon && !isSidebarCollapsed && (
                  <span className="ml-auto text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
