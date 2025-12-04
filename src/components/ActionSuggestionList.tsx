import Button from '@/components/shared/Button';

interface ActionSuggestion {
  id: string;
  name: string;
  detail?: string;
  planeType?: 'control' | 'data';
}

interface ActionSuggestionListProps {
  suggestions: ActionSuggestion[];
  onSelect: (name: string, planeType?: 'control' | 'data') => void;
  showPlaneType?: boolean;
}

export default function ActionSuggestionList({ suggestions, onSelect, showPlaneType = false }: ActionSuggestionListProps) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.id}
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => onSelect(suggestion.name, suggestion.planeType)}
          className="border-b border-slate-200 px-3 py-2.5 text-left justify-start hover:bg-slate-50 last:border-b-0 dark:border-slate-700 dark:hover:bg-slate-800 rounded-none shadow-none"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-900 dark:text-slate-100">
              {showPlaneType && suggestion.planeType && (
                <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold ${
                  suggestion.planeType === 'data'
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                    : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                }`}>
                  {suggestion.planeType === 'data' ? 'D' : 'C'}
                </span>
              )}
              {suggestion.name}
            </div>
            {suggestion.detail && (
              <div className={`text-xs text-slate-500 dark:text-slate-400 ${showPlaneType ? 'ml-6' : ''}`}>
                {suggestion.detail}
              </div>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}
