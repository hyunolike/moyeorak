import type { ReactNode } from "react";
import { Maju, type MajuExpression } from "@/components/brand/maju";

/** 마주가 건네는 안내 한 줄. 화면당 하나, 마주는 32px 소형. */
export function GuideLine({
  expression,
  children,
}: {
  expression: MajuExpression;
  children: ReactNode;
}) {
  return (
    <div className="bg-assistant text-text flex items-center gap-2.5 rounded-md px-3.5 py-3 text-[15px] leading-[1.45] font-semibold">
      <Maju expression={expression} size={32} className="flex-none" />
      <span>{children}</span>
    </div>
  );
}
