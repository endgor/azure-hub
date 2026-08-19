import { useEffect, useState } from 'react';
import Select from '@/components/shared/Select';
import { HOURS_PER_MONTH_PRESETS, MAX_HOURS_PER_MONTH, clampHoursPerMonth } from '@/lib/vmPricing/pricing';

interface HoursPerMonthFieldProps {
  id: string;
  hoursPerMonth: number;
  onChange: (hours: number) => void;
  labelClass: string;
}

const INTEGER = /^\d+$/;

export default function HoursPerMonthField({ id, hoursPerMonth, onChange, labelClass }: HoursPerMonthFieldProps) {
  /** Held as text so the field can be cleared and retyped without a clamp fighting the edit. */
  const [draft, setDraft] = useState(String(hoursPerMonth));

  useEffect(() => {
    setDraft(String(hoursPerMonth));
  }, [hoursPerMonth]);

  const handleChange = (value: string) => {
    setDraft(value);
    const parsed = Number(value);
    if (INTEGER.test(value) && parsed >= 1 && parsed <= MAX_HOURS_PER_MONTH) onChange(parsed);
  };

  const commit = () => {
    const parsed = Number(draft);
    // A cleared field reverts to the current runtime rather than collapsing to the minimum.
    const next = draft.trim() === '' || !Number.isFinite(parsed) ? hoursPerMonth : clampHoursPerMonth(parsed);
    setDraft(String(next));
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        Hours per month
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min={1}
          max={MAX_HOURS_PER_MONTH}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
          }}
          className="w-20 rounded-xl border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
        />
        <Select
          ariaLabel="Runtime preset"
          value=""
          placeholder="Preset"
          onChange={(value) => onChange(clampHoursPerMonth(Number(value)))}
          options={HOURS_PER_MONTH_PRESETS.map((preset) => ({
            value: String(preset.hours),
            label: preset.label,
            description: preset.description
          }))}
          widthClass="w-28"
          panelWidthClass="w-64"
        />
      </div>
    </div>
  );
}
