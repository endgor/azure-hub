'use client';

import { useEffect, useRef } from 'react';

interface GuideContentProps {
  html: string;
}

const COPY_ICON = `<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
</svg>`;

const CHECK_ICON = `<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
</svg>`;

const MAX_CODE_HEIGHT = 400;

export default function GuideContent({ html }: GuideContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const codeBlocks = contentRef.current.querySelectorAll('pre');

    codeBlocks.forEach((pre) => {
      const actualHeight = pre.scrollHeight;
      const codeElement = pre.querySelector('code');
      const codeText = codeElement?.textContent || '';

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper relative my-4';

      // Create container for pre
      const container = document.createElement('div');
      container.className = 'code-block-container relative';

      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className =
        'absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 transition-all backdrop-blur-sm z-10';
      copyButton.innerHTML = COPY_ICON;
      copyButton.title = 'Copy code';

      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          copyButton.innerHTML = CHECK_ICON;
          setTimeout(() => {
            copyButton.innerHTML = COPY_ICON;
          }, 2000);
        } catch {
          // Silently fail if clipboard is unavailable
        }
      });

      // Setup collapsible if needed
      const needsCollapse = actualHeight > MAX_CODE_HEIGHT;

      if (needsCollapse) {
        container.style.overflow = 'hidden';
        container.style.maxHeight = `${MAX_CODE_HEIGHT}px`;
        container.style.transition = 'max-height 0.3s ease';

        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className =
          'mt-2 px-4 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors';
        toggleButton.textContent = '▼ Show more';
        toggleButton.setAttribute('aria-expanded', 'false');

        let isExpanded = false;

        toggleButton.addEventListener('click', () => {
          isExpanded = !isExpanded;
          container.style.maxHeight = isExpanded ? `${actualHeight}px` : `${MAX_CODE_HEIGHT}px`;
          toggleButton.textContent = isExpanded ? '▲ Show less' : '▼ Show more';
          toggleButton.setAttribute('aria-expanded', String(isExpanded));
        });

        wrapper.appendChild(toggleButton);
      }

      // Assemble DOM
      pre.parentNode?.replaceChild(wrapper, pre);
      wrapper.insertBefore(container, wrapper.firstChild);
      container.appendChild(pre);
      container.appendChild(copyButton);

      // Reset pre styles
      pre.style.margin = '0';
      pre.style.borderRadius = '0.5rem';
    });
  }, [html]);

  return (
    <article
      ref={contentRef}
      className="prose prose-slate max-w-none dark:prose-invert
        prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100
        prose-h1:text-2xl prose-h1:mb-4
        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-7
        prose-a:text-sky-600 dark:prose-a:text-sky-300 prose-a:no-underline hover:prose-a:underline
        prose-code:text-sky-600 dark:prose-code:text-sky-300 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-slate-50 dark:prose-pre:bg-slate-800 prose-pre:text-slate-800 dark:prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700
        prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 prose-pre:prose-code:text-inherit
        prose-table:border-collapse prose-table:w-full
        prose-th:bg-white dark:prose-th:bg-slate-800 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-slate-900 dark:prose-th:text-slate-100 prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-600
        prose-td:bg-white dark:prose-td:bg-slate-800 prose-td:px-4 prose-td:py-2 prose-td:text-slate-600 dark:prose-td:text-slate-300 prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-600
        prose-ul:list-disc prose-ul:pl-6
        prose-ol:list-decimal prose-ol:pl-6
        prose-li:text-slate-600 dark:prose-li:text-slate-300
        prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400
        prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-strong:font-semibold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
