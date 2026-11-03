"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PURPOSE_CHIP, PURPOSES, type Purpose } from "@/lib/purposes";

/** 모여서 뭐 하는지 고르는 칩 묶음. 여러 개를 고를 수 있고 비워 둬도 된다. */
export function PurposeChips({
  value,
  onChange,
  readOnly = false,
  className,
}: {
  value: Purpose[];
  onChange?: (next: Purpose[]) => void;
  readOnly?: boolean;
  className?: string;
}) {
  if (readOnly) {
    const picked = PURPOSES.filter((p) => value.includes(p));
    if (picked.length === 0) return null;
    return (
      <ul
        aria-label="모임 목적"
        className={`flex flex-wrap gap-1.5 ${className ?? ""}`}
      >
        {picked.map((p) => (
          <li
            key={p}
            className="bg-surface-sunken text-text text-b4 rounded-pill px-3 py-1.5"
          >
            {PURPOSE_CHIP[p]}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ToggleGroup
      multiple
      aria-label="모여서 뭐 해요?"
      value={value}
      onValueChange={(next) => {
        const set = new Set(next as Purpose[]);
        onChange?.(PURPOSES.filter((p) => set.has(p)));
      }}
      className={`flex-wrap ${className ?? ""}`}
      spacing={1}
    >
      {PURPOSES.map((p) => (
        <ToggleGroupItem key={p} value={p} className="text-b3 h-9 px-4">
          {PURPOSE_CHIP[p]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
