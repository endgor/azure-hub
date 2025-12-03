'use client';

import { useState, useRef, useEffect } from 'react';

interface CollapsibleCodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: number;
}

export default function CollapsibleCodeBlock({
  code,
  language = 'text',
  maxHeight = 400,
}: CollapsibleCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      const height = preRef.current.scrollHeight;
      setNeedsCollapse(height > maxHeight);
    }
  }, [code, maxHeight]);

  return (
    <div className="relative my-4">
      <div
        className="relative overflow-hidden transition-all duration-300"
        style={{
          maxHeight: !isExpanded && needsCollapse ? `${maxHeight}px` : 'none',
        }}
      >
        <pre
          ref={preRef}
          className={`language-${language}`}
          style={{
            margin: 0,
            borderRadius: '0.5rem',
          }}
        >
          <code className={`language-${language}`}>{code}</code>
        </pre>

        {/* Gradient overlay when collapsed */}
        {!isExpanded && needsCollapse && (
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgb(241 245 249) 90%)',
            }}
          />
        )}
      </div>

      {/* Expand/Collapse button */}
      {needsCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 px-4 py-2 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▲ Show less' : '▼ Show more'}
        </button>
      )}
    </div>
  );
}
