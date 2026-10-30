import { rankSlots, validateSlots } from "@/server/schedule/slots";

const poll = {
  dateOptions: ["2026-11-08", "2026-11-09"],
  startMinute: 540,
  endMinute: 1440,
};

/** 서울 시각 문자열("2026-11-08 14:00")을 Date로 */
const at = (s: string) => new Date(`${s.replace(" ", "T")}:00+09:00`);

/** 서울 시각 from~to(미포함)를 30분 단위 슬롯으로 */
function range(day: string, from: string, to: string): Date[] {
  const out: Date[] = [];
  for (
    let t = at(`${day} ${from}`).getTime();
    t < at(`${day} ${to}`).getTime();
    t += 30 * 60 * 1000
  ) {
    out.push(new Date(t));
  }
  return out;
}

const D = "2026-11-08";
const votes = [
  {
    participantId: 1,
    name: "지수",
    slots: [...range(D, "10:00", "12:00"), ...range(D, "14:00", "17:00")],
  },
  {
    participantId: 2,
    name: "민준",
    slots: [...range(D, "10:00", "12:00"), ...range(D, "14:00", "17:00")],
  },
  {
    participantId: 3,
    name: "서연",
    slots: [...range(D, "14:00", "18:00")],
  },
  {
    participantId: 4,
    name: "현호",
    slots: [...range(D, "10:00", "11:00"), ...range(D, "14:00", "17:00")],
  },
];

test("validateSlots는 날짜 범위 밖과 시간 범위 밖 슬롯을 invalid로 돌려준다", () => {
  const ok = at("2026-11-08 14:00");
  const wrongDay = at("2026-11-10 14:00");
  const tooEarly = at("2026-11-08 08:30");
  expect(validateSlots([ok], poll)).toEqual({ ok: true });
  expect(validateSlots([ok, wrongDay, tooEarly], poll)).toEqual({
    ok: false,
    invalid: [wrongDay, tooEarly],
  });
});

test("validateSlots는 30분 경계가 아니거나 시작 시각 직전인 슬롯도 거른다", () => {
  const offGrid = at("2026-11-08 14:10");
  const beforeStart = at("2026-11-09 08:30");
  const lastSlot = at("2026-11-09 23:30");
  expect(validateSlots([offGrid, beforeStart, lastSlot], poll)).toEqual({
    ok: false,
    invalid: [offGrid, beforeStart],
  });
  // endMinute 1440은 자정까지, 서울 날짜 기준이라 UTC로는 전날이어도 통과한다
  expect(validateSlots([at("2026-11-08 09:00")], poll)).toEqual({ ok: true });
  expect(
    validateSlots([at("2026-11-09 00:00")], {
      ...poll,
      dateOptions: ["2026-11-08"],
    }),
  ).toEqual({ ok: false, invalid: [at("2026-11-09 00:00")] });
});

test("rankSlots는 4명 모두 가능한 14:00~17:00을 1순위로 둔다", () => {
  const [first] = rankSlots(votes, 4);
  expect(first.start).toEqual(at("2026-11-08 14:00"));
  expect(first.end).toEqual(at("2026-11-08 17:00"));
  expect([...first.available].sort()).toEqual(
    ["민준", "서연", "지수", "현호"].sort(),
  );
  expect(first.unavailable).toEqual([]);
});

test("rankSlots는 같은 인원이면 이른 시각이 먼저다", () => {
  const ranked = rankSlots(
    [
      { participantId: 1, name: "지수", slots: range(D, "15:00", "16:00") },
      { participantId: 2, name: "민준", slots: range(D, "15:00", "16:00") },
      { participantId: 3, name: "서연", slots: range(D, "10:00", "11:00") },
      { participantId: 4, name: "현호", slots: range(D, "10:00", "11:00") },
    ],
    4,
  );
  expect(ranked.map((r) => r.start)).toEqual([
    at("2026-11-08 10:00"),
    at("2026-11-08 15:00"),
  ]);
});

test("rankSlots는 참여자 집합이 바뀌면 구간을 끊는다", () => {
  const ranked = rankSlots(votes, 4);
  const morning = ranked.filter((r) => r.start < at("2026-11-08 12:00"));
  expect(morning).toHaveLength(2);
  expect(morning[0]).toMatchObject({
    start: at("2026-11-08 10:00"),
    end: at("2026-11-08 11:00"),
    available: ["지수", "민준", "현호"],
    unavailable: ["서연"],
  });
  expect(morning[1]).toMatchObject({
    start: at("2026-11-08 11:00"),
    end: at("2026-11-08 12:00"),
    available: ["지수", "민준"],
  });
  // 14~17(4명)과 17~18(서연 1명)도 별개 구간이다
  expect(ranked.at(-1)).toMatchObject({
    start: at("2026-11-08 17:00"),
    available: ["서연"],
  });
});
