import type { ReactElement } from 'react';

export type IconKey =
  | 'dashboard'
  | 'ipLookup'
  | 'serviceTags'
  | 'tenant'
  | 'subnet'
  | 'rbac'
  | 'entraId'
  | 'guides'
  | 'github'
  | 'help';

export const ICONS: Record<IconKey, (active: boolean) => ReactElement> = {
  dashboard: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M11 4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1h-7zm-8 0c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h5c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1H3zm0 9c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h7c.55 0 1-.45 1-1v-5c0-.55-.45-1-1-1H3zm11 0c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1h5c.55 0 1-.45 1-1v-5c0-.55-.45-1-1-1h-5z"
      />
    </svg>
  ),
  ipLookup: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M11 4a7 7 0 015.65 11.12l3.12 3.11a1 1 0 11-1.41 1.42l-3.12-3.12A7 7 0 1111 4zm0 2a5 5 0 100 10 5 5 0 000-10zm0 3a1 1 0 01.99.86L12 10v2a1 1 0 01-1.99.14L10 12v-2a1 1 0 011-1zm-2 0a1 1 0 01.99.86L10 10v2a1 1 0 01-1.99.14L8 12v-2a1 1 0 011-1z"
      />
    </svg>
  ),
  serviceTags: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M3 4a2 2 0 012-2h4.586a2 2 0 011.414.586l8.414 8.414a2 2 0 010 2.828l-4.586 4.586a2 2 0 01-2.828 0L3.586 10.414A2 2 0 013 9V4zm4 3a2 2 0 100-4 2 2 0 000 4z"
      />
    </svg>
  ),
  tenant: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M4 4a2 2 0 012-2h4a2 2 0 012 2v3h5a2 2 0 012 2v3h-2V9h-5v11h-2v-4H6v4H4V4zm4 0H6v5h4V4H8zm12 10a2 2 0 012 2v5h-2v-3h-4v3h-2v-5a2 2 0 012-2h4zm-1 2h-2v1h2v-1z"
      />
    </svg>
  ),
  subnet: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M5 3a2 2 0 00-2 2v5h18V5a2 2 0 00-2-2H5zm16 9H3v5a2 2 0 002 2h6v-3H9a1 1 0 110-2h6a1 1 0 010 2h-2v3h6a2 2 0 002-2v-5z"
      />
    </svg>
  ),
  rbac: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v1a3 3 0 106 0V7a3 3 0 00-3-3zm-7 11a1 1 0 011-1h12a1 1 0 011 1c0 2.5-1.5 5.5-7 5.5S5 17.5 5 15z"
      />
    </svg>
  ),
  entraId: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </svg>
  ),
  guides: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"
      />
    </svg>
  ),
  github: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.09.68-.23.68-.5 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.62.07-.61.07-.61 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.35 1.11 2.92.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.12-4.56-4.99 0-1.1.39-1.99 1.03-2.7-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03a9.3 9.3 0 012.5-.35c.85 0 1.7.12 2.5.35 1.9-1.3 2.74-1.03 2.74-1.03.55 1.39.2 2.42.1 2.67.64.7 1.03 1.6 1.03 2.7 0 3.88-2.34 4.73-4.57 4.99.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.68.5A10.06 10.06 0 0022 12.26C22 6.58 17.52 2 12 2z"
      />
    </svg>
  ),
  help: (active: boolean) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-colors ${active ? 'text-[#0A84FF] dark:text-[#0A84FF]' : 'text-[#0A84FF]/80 dark:text-[#0A84FF]/80'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75a3.375 3.375 0 116.75 0c0 1.5-1.125 2.25-2.25 3s-1.125 1.5-1.125 2.25"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.007" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
};

export const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-current">
    <path
      fill="currentColor"
      d="M12 7a5 5 0 110 10 5 5 0 010-10zm0-5a1 1 0 01.99.86L13 3v2a1 1 0 01-1.99.14L11 5V3a1 1 0 011-1zm0 18a1 1 0 01.99.86L13 21v2a1 1 0 01-1.99.14L11 23v-2a1 1 0 011-1zM4.22 5.64a1 1 0 011.41 0L6.99 7a1 1 0 01-1.32 1.5l-.1-.08-1.36-1.36a1 1 0 010-1.42zm12.73 12.73a1 1 0 011.41 0l1.36 1.36a1 1 0 01-1.32 1.5l-.1-.08-1.36-1.36a1 1 0 010-1.42zM1 12a1 1 0 01.86-.99L2 11h2a1 1 0 01.14 1.99L4 13H2a1 1 0 01-1-1zm18 0a1 1 0 01.99-.86L20 11h2a1 1 0 01.14 1.99L22 13h-2a1 1 0 01-1-1zm-13.78 5.64a1 1 0 011.32 1.5l-.1.08-1.36 1.36a1 1 0 01-1.5-1.32l.08-.1 1.36-1.36zm12.73-12.73a1 1 0 011.32 1.5l-.1.08-1.36 1.36a1 1 0 01-1.5-1.32l.08-.1 1.36-1.36z"
    />
  </svg>
);

export const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-current">
    <path
      fill="currentColor"
      d="M12.06 2a.75.75 0 01.53.22 7.5 7.5 0 009.19 9.19.75.75 0 01.95.95A9 9 0 1111.83 1.47.75.75 0 0112.06 2zm-1.12 2.1A7.49 7.49 0 0021.9 12a7.5 7.5 0 01-10.96-7.9z"
    />
  </svg>
);
