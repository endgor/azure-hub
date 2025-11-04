import Button from '@/components/shared/Button';

interface ActionSuggestion {
  id: string;
  name: string;
  detail?: string;
}

interface ActionSuggestionListProps {
  suggestions: ActionSuggestion[];
  onSelect: (name: string) => void;
}

export default function ActionSuggestionList({ suggestions, onSelect }: ActionSuggestionListProps) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.id}
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => onSelect(suggestion.name)}
          className="border-b border-slate-200 px-3 py-2.5 text-left justify-start hover:bg-slate-50 last:border-b-0 dark:border-slate-700 dark:hover:bg-slate-800 rounded-none shadow-none"
        >
          <div className="flex flex-col gap-0.5">
            <div className="font-mono text-xs text-slate-900 dark:text-slate-100">
              {suggestion.name}
            </div>
            {suggestion.detail && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {suggestion.detail}
              </div>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}
