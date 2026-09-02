interface LastUpdatedProps {
  date: string | null | undefined;
}

export default function LastUpdated({ date }: LastUpdatedProps) {
  if (!date) return null;

  return (
    <p className="text-xs text-slate-400 dark:text-slate-500">
      Data last updated <span className="font-medium text-slate-500 dark:text-slate-400">{date}</span>
    </p>
  );
}
