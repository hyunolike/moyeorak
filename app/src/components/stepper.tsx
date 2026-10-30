"use client";

const stepButton =
  "grid size-9 cursor-pointer place-items-center rounded-lg text-t1 disabled:cursor-not-allowed disabled:opacity-50";

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
      <legend className="text-b3 text-k-900 mb-2">{label}</legend>
      <div className="bg-k-50 flex h-14 w-full items-center justify-between rounded-lg px-4">
        <button
          type="button"
          aria-label="감소"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className={`${stepButton} bg-k-5 text-k-700`}
        >
          −
        </button>
        <span data-testid="participant-count" className="text-b2 text-k-900">
          {value}명
        </span>
        <button
          type="button"
          aria-label="증가"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className={`${stepButton} bg-primary-main text-k-5`}
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
