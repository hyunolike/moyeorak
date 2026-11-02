"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";
import {
  DAY_TIME_LABELS,
  type DayTime,
  MAX_POLL_DATES,
  PICKABLE_DAYS,
  seoulDateList,
  type WindowChoice,
  weekday,
} from "@/lib/poll-window";

export type Preset = WindowChoice["preset"];

const PRESETS: { value: Preset; label: string; caption: string }[] = [
  {
    value: "two-weeks",
    label: "2주 안에",
    caption: "오늘부터 2주, 오전 9시부터 자정까지",
  },
  {
    value: "weekends",
    label: "주말만",
    caption: "앞으로 2주의 토요일과 일요일",
  },
  {
    value: "weekday-evenings",
    label: "평일 저녁",
    caption: "앞으로 2주의 월~금, 저녁 6시부터 자정까지",
  },
  {
    value: "custom",
    label: "날짜 고르기",
    caption: "최대 14일까지 고를 수 있어요",
  },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const monthDay = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return { month: m, day: d };
};

/**
 * 시간 투표판의 기간을 고른다. 친구들이 훑을 시간표가 작을수록 응답하기 쉽다.
 * 날짜 고르기는 오늘부터 4주 달력에서 최대 14일과 하루 시간대를 고른다.
 */
export function PollWindowPicker({
  today,
  preset,
  onPresetChange,
  dates,
  onDatesChange,
  time,
  onTimeChange,
}: {
  today: string;
  preset: Preset;
  onPresetChange: (preset: Preset) => void;
  dates: string[];
  onDatesChange: (dates: string[]) => void;
  time: DayTime;
  onTimeChange: (time: DayTime) => void;
}) {
  const caption = PRESETS.find((p) => p.value === preset)?.caption;
  const days = seoulDateList(today, PICKABLE_DAYS);
  const full = dates.length >= MAX_POLL_DATES;
  const firstMonth = monthDay(days[0]).month;
  const lastMonth = monthDay(days[days.length - 1]).month;
  const monthLabel =
    firstMonth === lastMonth
      ? `${firstMonth}월`
      : `${firstMonth}월~${lastMonth}월`;

  return (
    <fieldset className="mt-6 min-w-0 border-0 p-0">
      <legend className="text-b3 text-text">언제 중에서 정할까요?</legend>
      {/* 값이 하나뿐인 단일 선택: 눌린 항목을 다시 눌러도 해제되지 않게 막는다 */}
      <ToggleGroup
        aria-label="기간"
        value={[preset]}
        onValueChange={(next) => {
          const picked = next[0] as Preset | undefined;
          if (picked) onPresetChange(picked);
        }}
        className="bg-surface-sunken mt-2 grid w-full grid-cols-2 p-1"
        spacing={1}
      >
        {PRESETS.map(({ value, label }) => (
          <ToggleGroupItem key={value} value={value} className="text-b3 h-11">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-muted text-c2 mt-2 px-1">{caption}</p>

      {preset === "custom" && (
        <div className="mt-4">
          <p className="text-text text-b3 mb-2 px-1 font-semibold">
            {monthLabel}
          </p>
          <div className="text-muted text-c2 grid grid-cols-7 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: weekday(today) }, (_, i) => (
              // 첫 주 앞의 빈칸. 날짜 대신 위치를 키로 쓴다.
              // biome-ignore lint/suspicious/noArrayIndexKey: 내용 없는 고정 빈칸이다
              <span key={`blank-${i}`} />
            ))}
            {days.map((date) => {
              const { month, day } = monthDay(date);
              const selected = dates.includes(date);
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${month}월 ${day}일 ${WEEKDAYS[weekday(date)]}요일`}
                  disabled={!selected && full}
                  onClick={() =>
                    onDatesChange(
                      selected
                        ? dates.filter((d) => d !== date)
                        : [...dates, date],
                    )
                  }
                  className={cn(
                    "text-b3 h-10 rounded-md tabular-nums transition-colors disabled:opacity-35",
                    selected
                      ? "bg-action text-on-action font-bold"
                      : "bg-surface-sunken text-text",
                  )}
                >
                  {day === 1 ? `${month}/${day}` : day}
                </button>
              );
            })}
          </div>
          <p className="text-muted text-c2 mt-2 px-1" aria-live="polite">
            {full
              ? `${dates.length}일 골랐어요(최대 ${MAX_POLL_DATES}일)`
              : `${dates.length}일 골랐어요`}
          </p>
          <ToggleGroup
            aria-label="시간대"
            value={[time]}
            onValueChange={(next) => {
              const picked = next[0] as DayTime | undefined;
              if (picked) onTimeChange(picked);
            }}
            className="bg-surface-sunken mt-3 w-full p-1"
            spacing={1}
          >
            {(Object.keys(DAY_TIME_LABELS) as DayTime[]).map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="text-b4 h-10 flex-1"
              >
                {DAY_TIME_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </fieldset>
  );
}
