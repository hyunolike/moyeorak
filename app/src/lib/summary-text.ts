import { formatDuration } from "@/components/location/format";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";

export type MeetingSummary = {
  meetingId: string;
  hostName: string;
  start: string | null;
  end: string | null;
  place: {
    name: string;
    lat: number;
    lng: number;
    /** 확정 역의 노선. 데이터에 따라 "6호선", "6", null 등으로 온다. */
    line: string | null;
    mapUrl: string;
  } | null;
  travel: { name: string; from: string | null; minutes: number | null }[];
};

export function stationLabel(name: string): string {
  return name.endsWith("역") ? name : `${name}역`;
}

/** 노선이 "6"처럼 숫자만 오면 "6호선"으로 맞춘다. 그 밖의 이름은 그대로 둔다. */
export function lineName(line: string): string {
  return /^[1-9]$/.test(line.trim()) ? `${line.trim()}호선` : line;
}

function travelLine(t: MeetingSummary["travel"][number]): string {
  const head = t.from ? `${t.name} ${t.from}에서` : t.name;
  if (t.minutes === null) return head;
  return `${head} ${formatDuration(t.minutes)}`;
}

/** 단톡방에 붙여 넣는 요약. 없는 줄은 뺀다. */
export function summaryText(s: MeetingSummary, link: string): string {
  const lines = [`📍 ${s.hostName}님의 모임`];
  if (s.start && s.end) {
    lines.push(
      `🗓 ${formatSlotDate(s.start)} ${formatSlotRange(s.start, s.end)}`,
    );
  }
  if (s.place) {
    lines.push(`🚉 ${stationLabel(s.place.name)}`);
    for (const t of s.travel) lines.push(travelLine(t));
    lines.push(`지도 ${s.place.mapUrl}`);
  }
  lines.push(link);
  return lines.join("\n");
}
