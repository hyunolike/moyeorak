const SLOT_MS = 30 * 60 * 1000;
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 DST가 없어 고정 오프셋이다.

export type Poll = {
  dateOptions: string[];
  startMinute: number;
  endMinute: number;
};

export type VoteSlots = {
  participantId: number;
  name: string;
  slots: Date[];
};

export type BestSlot = {
  start: Date;
  end: Date;
  available: string[];
  unavailable: string[];
};

/** 서울 시각 기준 날짜(YYYY-MM-DD)와 자정부터의 분 */
export function seoulParts(d: Date): { date: string; minute: number } {
  const shifted = new Date(d.getTime() + SEOUL_OFFSET_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * 서울 날짜(YYYY-MM-DD)의 자정 시각. 달력에 없는 날짜(예: 2026-02-30)는
 * 다음 달로 넘기지 않고 Invalid Date를 돌려준다.
 */
export function seoulMidnight(date: string): Date {
  const utc = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(utc) || new Date(utc).toISOString().slice(0, 10) !== date) {
    return new Date(Number.NaN);
  }
  return new Date(utc - SEOUL_OFFSET_MS);
}

/** 자정(seoulMidnight)에서 minute분 뒤의 칸 시작 시각 */
export function slotInstant(midnight: Date, minute: number): Date {
  return new Date(midnight.getTime() + minute * 60 * 1000);
}

export function validateSlots(
  slots: Date[],
  poll: Poll,
): { ok: true } | { ok: false; invalid: Date[] } {
  const invalid = slots.filter((s) => {
    const t = s.getTime();
    if (Number.isNaN(t) || t % SLOT_MS !== 0) return true;
    const { date, minute } = seoulParts(s);
    return (
      !poll.dateOptions.includes(date) ||
      minute < poll.startMinute ||
      minute >= poll.endMinute
    );
  });
  return invalid.length === 0 ? { ok: true } : { ok: false, invalid };
}

export function rankSlots(
  votes: VoteSlots[],
  totalParticipants: number,
): BestSlot[] {
  // 슬롯 시각 -> 가능한 참여자 이름들(투표 순서 유지)
  const byTime = new Map<number, string[]>();
  for (const v of votes) {
    for (const s of new Set(v.slots.map((d) => d.getTime()))) {
      const names = byTime.get(s) ?? [];
      names.push(v.name);
      byTime.set(s, names);
    }
  }

  const everyone = votes.map((v) => v.name);
  type Group = { start: number; last: number; available: string[] };
  const groups: Group[] = [];
  for (const t of [...byTime.keys()].sort((a, b) => a - b)) {
    const available = byTime.get(t) as string[];
    const prev = groups.at(-1);
    if (
      prev &&
      prev.last + SLOT_MS === t &&
      prev.available.length === available.length &&
      prev.available.every((n, i) => n === available[i])
    ) {
      prev.last = t;
    } else {
      groups.push({ start: t, last: t, available });
    }
  }

  // totalParticipants는 정원이라 이름을 붙일 수 없다. 정렬 키는 가능 인원과 시작 시각이다.
  void totalParticipants;
  return groups
    .map((g) => ({
      start: new Date(g.start),
      end: new Date(g.last + SLOT_MS),
      available: g.available,
      unavailable: everyone.filter((n) => !g.available.includes(n)),
    }))
    .sort(
      (a, b) =>
        b.available.length - a.available.length ||
        a.start.getTime() - b.start.getTime(),
    );
}
