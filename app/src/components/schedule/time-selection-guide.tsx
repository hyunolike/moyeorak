import { cn } from "@/lib/cn";

function Legend({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="text-b5 text-k-500 inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "inline-flex size-3 shrink-0 rounded-[3.43px] border",
          checked
            ? "border-primary-main bg-primary-main"
            : "border-k-100 bg-k-10",
        )}
      />
      {label}
    </span>
  );
}

export function TimeSelectionGuide() {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-b4 text-k-600">
        클릭하거나 쓸어내려 가능 시간대를 지정해보세요
      </p>
      <div className="flex items-center gap-3">
        <Legend checked label="가능" />
        <Legend checked={false} label="불가" />
      </div>
    </div>
  );
}
