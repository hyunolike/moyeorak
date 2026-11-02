"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusChip } from "@/components/layout/status-chip";
import { useMyMeetings } from "@/lib/api";
import type { MyMeeting } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { peekDeviceKey } from "@/lib/device-key";
import {
  groupMyMeetings,
  myMeetingNextStep,
  myMeetingStatusLabel,
} from "@/lib/my-meetings";

/**
 * 첫 화면의 "내 모임". 이 브라우저에 기기 키가 이미 있을 때만 목록을 받는다(키를 새로 만들지 않는다).
 * 서버 렌더와 첫 렌더에서는 아무것도 그리지 않고, 받는 동안에도 자리를 잡지 않는다.
 * 목록이 비면 첫 화면은 그대로다.
 */
export function MyMeetings() {
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  useEffect(() => setDeviceKey(peekDeviceKey()), []);
  if (!deviceKey) return null;
  return <MyMeetingsLoader deviceKey={deviceKey} />;
}

function MyMeetingsLoader({ deviceKey }: { deviceKey: string }) {
  const { data } = useMyMeetings(deviceKey);
  // 지난 모임을 가르는 "지금"은 목록을 받을 때마다 다시 잡는다.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (data) setNow(new Date());
  }, [data]);
  if (!data || data.length === 0) return null;
  return <MyMeetingsView list={data} now={now} />;
}

export function MyMeetingsView({
  list,
  now,
}: {
  list: MyMeeting[];
  now: Date;
}) {
  const { active, past } = groupMyMeetings(list, now);
  const [pastOpen, setPastOpen] = useState(false);

  return (
    <section
      aria-labelledby="my-meetings-title"
      className="animate-in fade-in mt-7 duration-200"
    >
      <h2 id="my-meetings-title" className="text-text text-t2">
        내 모임
      </h2>
      {active.length > 0 && (
        <ul className="border-border divide-border mt-3 divide-y overflow-hidden rounded-md border">
          {active.map((m) => (
            <MeetingRow key={m.id} meeting={m} past={false} />
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <div className={cn(active.length > 0 ? "mt-2" : "mt-3")}>
          <button
            type="button"
            aria-expanded={pastOpen}
            aria-controls="my-meetings-past"
            onClick={() => setPastOpen((open) => !open)}
            className="text-muted text-b3 flex h-11 w-full cursor-pointer items-center gap-1 px-1"
          >
            지난 모임 {past.length}개
            <Chevron open={pastOpen} />
          </button>
          {pastOpen && (
            <ul
              id="my-meetings-past"
              className="border-border divide-border divide-y overflow-hidden rounded-md border"
            >
              {past.map((m) => (
                <MeetingRow key={m.id} meeting={m} past />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function MeetingRow({ meeting, past }: { meeting: MyMeeting; past: boolean }) {
  const tone = past
    ? "waiting"
    : meeting.status === "confirmed"
      ? "done"
      : "selected";
  return (
    <li>
      <Link
        href={`/meetings/${meeting.id}`}
        className={cn(
          "active:bg-surface-sunken flex items-center gap-3 px-4 py-3.5 transition-colors",
          past && "opacity-60",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="text-text text-b2 block truncate font-semibold">
            {meeting.hostName}님의 모임
            {meeting.isHost && (
              <span className="text-muted text-c1 ml-1.5 font-normal">
                내가 만든
              </span>
            )}
          </span>
          <span className="text-muted text-c1 mt-0.5 block truncate">
            {myMeetingNextStep(meeting)}
          </span>
        </span>
        <StatusChip tone={tone}>{myMeetingStatusLabel(meeting)}</StatusChip>
      </Link>
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-4 transition-transform duration-200",
        open && "rotate-180",
      )}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
