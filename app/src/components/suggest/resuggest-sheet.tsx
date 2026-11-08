"use client";

import { useState } from "react";
import { PurposeChips } from "@/components/meeting/purpose-chips";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Purpose } from "@/lib/purposes";
import type { SuggestConditions } from "@/lib/suggest-conditions";

type Days = NonNullable<SuggestConditions["days"]>;
type Time = NonNullable<SuggestConditions["time"]>;

const DAYS: { value: Days; label: string }[] = [
  { value: "weekday", label: "평일" },
  { value: "weekend", label: "주말" },
];
const TIMES: { value: Time; label: string }[] = [
  { value: "day", label: "낮" },
  { value: "evening", label: "저녁" },
];

function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-b3 text-muted">{title}</p>
      {children}
    </div>
  );
}

/** 같은 줄에서는 하나만 고르고, 누른 칩을 다시 누르면 풀린다. */
function SingleChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (next: T | undefined) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={value ? [value] : []}
      onValueChange={(next) => onChange(next[0] as T | undefined)}
      spacing={1}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="text-b3 h-9 px-4"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** 조건을 골라 제안을 다시 받는 시트. NO_MATCH 같은 안내는 message로 받아 시트 안에 둔다. */
export function ResuggestSheet({
  kind,
  openStationIds,
  purposes,
  message,
  pending = false,
  onPurposesChange,
  onSubmit,
  onClose,
}: {
  kind: "schedule" | "location";
  /** 지금 열려 있는 제안의 역 id들. "지금 제안한 역 말고"가 이걸 뺀다. */
  openStationIds: number[];
  purposes: Purpose[];
  message?: string | null;
  pending?: boolean;
  onPurposesChange?: (next: Purpose[]) => void;
  onSubmit: (conditions: SuggestConditions) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState<Days>();
  const [time, setTime] = useState<Time>();
  const [long, setLong] = useState(false);
  const [exclude, setExclude] = useState(false);
  // 저장 응답을 기다리지 않고 방금 고른 값을 바로 보여 준다.
  const [pickedPurposes, setPickedPurposes] = useState(purposes);
  const [purposesChanged, setPurposesChanged] = useState(false);

  const conditions: SuggestConditions =
    kind === "schedule"
      ? {
          ...(days && { days }),
          ...(time && { time }),
          ...(long && { minHours: 2 as const }),
        }
      : exclude
        ? { excludeStationIds: openStationIds }
        : {};
  // 목적만 바꿔도 그 목적으로 다시 받을 수 있다.
  const canSubmit =
    Object.keys(conditions).length > 0 ||
    (kind === "location" && purposesChanged);

  return (
    <Drawer
      showSwipeHandle
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent aria-label="조건 바꿔 다시 받기">
        <DrawerHeader className="px-5 pt-2 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-t1 text-text font-bold">
            어떤 조건으로 다시 볼까요?
          </DrawerTitle>
          <DrawerDescription>
            고른 조건에 맞는 것만 추려서 보여 드려요
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-5 pt-3.5">
          {kind === "schedule" ? (
            <>
              <Row title="요일">
                <SingleChoice
                  label="요일"
                  options={DAYS}
                  value={days}
                  onChange={setDays}
                />
              </Row>
              <Row title="시간대">
                <SingleChoice
                  label="시간대"
                  options={TIMES}
                  value={time}
                  onChange={setTime}
                />
              </Row>
              <Row title="길이">
                <SingleChoice
                  label="길이"
                  options={[{ value: "long", label: "2시간 이상" }]}
                  value={long ? "long" : undefined}
                  onChange={(next) => setLong(next === "long")}
                />
              </Row>
            </>
          ) : (
            <>
              <Row title="역">
                <SingleChoice
                  label="역"
                  options={[{ value: "other", label: "지금 제안한 역 말고" }]}
                  value={exclude ? "other" : undefined}
                  onChange={(next) => setExclude(next === "other")}
                />
              </Row>
              <Row title="모여서 뭐 해요?">
                <PurposeChips
                  value={pickedPurposes}
                  onChange={(next) => {
                    setPickedPurposes(next);
                    setPurposesChanged(true);
                    onPurposesChange?.(next);
                  }}
                />
              </Row>
            </>
          )}
          {message && (
            <p role="status" className="text-b3 text-error">
              {message}
            </p>
          )}
        </div>

        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="cta"
            disabled={!canSubmit || pending}
            onClick={() => onSubmit(conditions)}
          >
            다시 받기
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
