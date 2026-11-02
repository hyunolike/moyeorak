import {
  buildIcs,
  type CalendarEvent,
  calendarEvent,
  googleCalendarUrl,
} from "@/lib/calendar";
import type { MeetingSummary } from "@/lib/summary-text";

const summary: MeetingSummary = {
  meetingId: "m1",
  hostName: "현호",
  start: "2026-11-07T09:00:00.000Z", // 서울 18:00
  end: "2026-11-07T12:00:00.000Z",
  place: {
    name: "녹사평",
    lat: 37.53,
    lng: 126.98,
    line: "6호선",
    mapUrl: "https://map.kakao.com/link/map/x,37.53,126.98",
  },
  travel: [],
};
const link = "https://moyeorak.hyunolike.dev/meetings/m1";

test("calendarEvent는 확정 시작부터 2시간짜리 일정을 만든다", () => {
  const event = calendarEvent(summary, link) as CalendarEvent;
  expect(event.title).toBe("현호님의 모임");
  expect(event.location).toBe("녹사평역");
  expect(event.start.toISOString()).toBe("2026-11-07T09:00:00.000Z");
  // 확정 끝 시각과 상관없이 2시간이다.
  expect(event.end.toISOString()).toBe("2026-11-07T11:00:00.000Z");
  expect(event.description).toContain(link);
});

test("calendarEvent는 시작 시각이 없으면 null", () => {
  expect(calendarEvent({ ...summary, start: null, end: null }, link)).toBe(
    null,
  );
});

test("calendarEvent는 장소가 없으면 location이 null", () => {
  const event = calendarEvent({ ...summary, place: null }, link);
  expect(event?.location).toBe(null);
});

test("buildIcs는 서울 시간대로 시작과 끝을 적는다", () => {
  const event = calendarEvent(summary, link) as CalendarEvent;
  const ics = buildIcs(event, {
    uid: "m1@moyeorak",
    now: new Date("2026-11-02T00:00:00Z"),
  });
  const lines = ics.split("\r\n");
  expect(lines[0]).toBe("BEGIN:VCALENDAR");
  expect(lines).toContain("VERSION:2.0");
  expect(lines).toContain("TZID:Asia/Seoul");
  expect(lines).toContain("DTSTART;TZID=Asia/Seoul:20261107T180000");
  expect(lines).toContain("DTEND;TZID=Asia/Seoul:20261107T200000");
  expect(lines).toContain("DTSTAMP:20261102T000000Z");
  expect(lines).toContain("UID:m1@moyeorak");
  expect(lines).toContain("SUMMARY:현호님의 모임");
  expect(lines).toContain("LOCATION:녹사평역");
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
});

test("buildIcs는 쉼표, 세미콜론, 줄바꿈을 이스케이프하고 긴 줄을 75바이트로 접는다", () => {
  const event: CalendarEvent = {
    title: "a,b;c\\d",
    location: null,
    description: `첫 줄\n${"가".repeat(40)}`,
    start: new Date("2026-11-07T09:00:00Z"),
    end: new Date("2026-11-07T11:00:00Z"),
  };
  const ics = buildIcs(event, { uid: "u", now: new Date(0) });
  expect(ics).toContain("SUMMARY:a\\,b\\;c\\\\d");
  expect(ics).not.toContain("LOCATION");
  for (const line of ics.split("\r\n")) {
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  }
  // 접은 줄을 다시 펴면 원래 값이 된다.
  const unfolded = ics.replace(/\r\n /g, "");
  expect(unfolded).toContain(`DESCRIPTION:첫 줄\\n${"가".repeat(40)}`);
});

test("googleCalendarUrl은 UTC 시각과 제목, 장소를 담는다", () => {
  const event = calendarEvent(summary, link) as CalendarEvent;
  const url = new URL(googleCalendarUrl(event));
  expect(url.origin + url.pathname).toBe(
    "https://calendar.google.com/calendar/render",
  );
  expect(url.searchParams.get("action")).toBe("TEMPLATE");
  expect(url.searchParams.get("text")).toBe("현호님의 모임");
  expect(url.searchParams.get("dates")).toBe(
    "20261107T090000Z/20261107T110000Z",
  );
  expect(url.searchParams.get("location")).toBe("녹사평역");
  expect(url.searchParams.get("ctz")).toBe("Asia/Seoul");
  expect(url.searchParams.get("details")).toContain(link);
});
