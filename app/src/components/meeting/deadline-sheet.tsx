"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSetDeadline } from "@/lib/api";
import { respondByOptions } from "@/lib/respond-by";

/** 모임장이 응답 마감을 고르거나 없애는 시트. 보기를 누르면 바로 저장한다. */
export function DeadlineSheet({
  meetingId,
  hasDeadline,
  open,
  onClose,
}: {
  meetingId: string;
  hasDeadline: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const set = useSetDeadline(meetingId);
  const options = useMemo(() => respondByOptions(new Date(), null), []);
  const send = (value: string | null) =>
    set.mutate(value, {
      onSuccess: onClose,
      onError: () =>
        toast("마감을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요"),
    });

  return (
    <Drawer
      showSwipeHandle
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent aria-label="응답 마감">
        <DrawerHeader className="px-5 pt-2 text-left">
          <DrawerTitle>응답 마감</DrawerTitle>
          <DrawerDescription>언제까지 응답을 받을까요?</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          {options.map((o) => (
            <Button
              key={o.key}
              type="button"
              variant="secondary"
              disabled={set.isPending}
              onClick={() => send(o.at.toISOString())}
            >
              {o.label}
            </Button>
          ))}
          {hasDeadline && (
            <Button
              type="button"
              variant="ghost"
              disabled={set.isPending}
              onClick={() => send(null)}
            >
              마감 없애기
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
