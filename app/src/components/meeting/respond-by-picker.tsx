"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RespondByOption } from "@/lib/respond-by";

/** 응답 마감을 고르는 칩 줄. "정하지 않음"이 기본이고 하나만 고른다. */
export function RespondByPicker({
  value,
  options,
  onChange,
}: {
  value: RespondByOption["key"] | null;
  options: RespondByOption[];
  onChange: (next: RespondByOption["key"] | null) => void;
}) {
  const current = value ?? "none";
  return (
    <ToggleGroup
      aria-label="응답 마감"
      value={[current]}
      onValueChange={(next) => {
        const picked = next[0];
        // 눌린 칩을 다시 눌러도 해제되지 않게 막는다.
        if (!picked) return;
        onChange(picked === "none" ? null : (picked as RespondByOption["key"]));
      }}
      className="flex-wrap"
      spacing={1}
    >
      <ToggleGroupItem value="none" className="text-b3 h-9 px-4">
        정하지 않음
      </ToggleGroupItem>
      {options.map((o) => (
        <ToggleGroupItem key={o.key} value={o.key} className="text-b3 h-9 px-4">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
