import { type MeetingSummary, stationLabel } from "@/lib/summary-text";

/** 확정 시각은 시작만 믿는다. 일정 길이는 2시간으로 둔다. */
export const EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export type CalendarEvent = {
  title: string;
  location: string | null;
  description: string;
  start: Date;
  end: Date;
};

/** 약속 카드로 캘린더 일정을 만든다. 시작 시각이 없는 모임(장소만)은 null이다. */
export function calendarEvent(
  s: MeetingSummary,
  link: string,
): CalendarEvent | null {
  if (!s.start) return null;
  const start = new Date(s.start);
  return {
    title: `${s.hostName}님의 모임`,
    location: s.place ? stationLabel(s.place.name) : null,
    description: `모여락에서 정한 약속이에요\n${link}`,
    start,
    end: new Date(start.getTime() + EVENT_DURATION_MS),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 20261107T090000 꼴. Date의 UTC 값을 그대로 쓴다. */
function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

const utcStamp = (d: Date) => `${stamp(d)}Z`;
/** 한국은 서머타임이 없어 +9시간만 더하면 서울 벽시계 시각이다. */
const seoulStamp = (d: Date) => stamp(new Date(d.getTime() + SEOUL_OFFSET_MS));

/** RFC 5545 TEXT 값 이스케이프. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** 한 줄이 75바이트를 넘으면 접는다. 이어지는 줄은 공백 하나로 시작한다. 글자 중간에서 자르지 않는다. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** iCalendar(.ics) 본문. 시각은 Asia/Seoul 시간대로 적는다. */
export function buildIcs(
  event: CalendarEvent,
  { uid, now = new Date() }: { uid: string; now?: Date },
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//moyeorak//ko",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Seoul",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0900",
    "TZOFFSETTO:+0900",
    "TZNAME:KST",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART;TZID=Asia/Seoul:${seoulStamp(event.start)}`,
    `DTEND;TZID=Asia/Seoul:${seoulStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** 구글 캘린더의 일정 추가 화면 주소. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    details: event.description,
    ctz: "Asia/Seoul",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
