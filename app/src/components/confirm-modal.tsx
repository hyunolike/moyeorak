"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * 확정 확인 시트(v4). 아래에서 올라오고 끌어내려 닫을 수 있다.
 * 부르는 쪽이 열릴 때만 렌더하므로 항상 열린 상태로 그리고, 닫힘 요청은 onClose로 올린다.
 * summary는 무엇을 확정하는지 한 줄, caption은 되돌릴 수 없는 점을 알리는 주의 문구다.
 */
export function ConfirmModal({
  title,
  summary,
  caption,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
}: {
  title: string;
  summary?: string;
  caption?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <Drawer
      showSwipeHandle
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="gap-3.5 px-5 pt-2 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-h2 text-text">{title}</DrawerTitle>
          {summary && (
            <p className="text-t1 text-text tabular-nums">{summary}</p>
          )}
          {caption && (
            <p className="text-warning text-b3 font-semibold">{caption}</p>
          )}
        </DrawerHeader>
        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="cta"
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
