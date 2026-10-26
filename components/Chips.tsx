'use client';

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  render,
  label,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  render?: (v: T) => React.ReactNode;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          role="radio"
          aria-checked={value === opt}
          data-on={value === opt}
          className="chip"
          onClick={() => onChange(opt)}
        >
          {render ? render(opt) : opt}
        </button>
      ))}
    </div>
  );
}
