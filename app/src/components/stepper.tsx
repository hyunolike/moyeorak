"use client";

const stepButton =
  "grid size-10 cursor-pointer place-items-center rounded-full text-t1 transition-transform duration-(--duration-press) active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text";

export function Stepper({
  label,
  value,
  min = 2,
  max = 20,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-b3 text-text mb-2">{label}</legend>
      <div className="bg-surface-sunken flex h-14 w-full items-center justify-between rounded-md px-2">
        <button
          type="button"
          aria-label="감소"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className={`${stepButton} bg-bg text-text`}
        >
          −
        </button>
        <span data-testid="participant-count" className="text-t2 text-text">
          {value}명
        </span>
        <button
          type="button"
          aria-label="증가"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className={`${stepButton} bg-action text-on-action`}
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
