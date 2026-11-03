import {
  averagePick,
  mostPick,
  soonestPick,
} from "@/server/ai/suggest/fixtures";
import { templateReason } from "@/server/ai/suggest/templates";

test("문장 틀: 모두 가능", () => {
  expect(
    templateReason(
      { ...mostPick, available: ["가", "나", "다"], unavailable: [] },
      3,
    ),
  ).toBe("3명 모두 가능해요.");
});

test("문장 틀: 3명 중 2명, 이름 이어 붙이기", () => {
  expect(templateReason(mostPick, 3)).toBe(
    "3명 중 2명이 가능해요. 지연님은 어려워요.",
  );
  expect(templateReason({ ...mostPick, unavailable: ["A", "B"] }, 4)).toBe(
    "4명 중 2명이 가능해요. A님과 B님은 어려워요.",
  );
  expect(templateReason({ ...mostPick, unavailable: ["A", "B", "C"] }, 5)).toBe(
    "5명 중 2명이 가능해요. A님 외 2명은 어려워요.",
  );
});

test("문장 틀: 가장 빠른 날", () => {
  expect(templateReason(soonestPick, 3)).toBe(
    "가장 빨리 모일 수 있는 날이에요. 2명이 가능해요.",
  );
});

test("문장 틀: 장소 평균은 반올림하고, 모르는 사람이 있으면 모두를 뺀다", () => {
  expect(templateReason(averagePick, 3)).toBe("평균 31분이면 모두 도착해요.");
  const unknown = {
    ...averagePick,
    perParticipant: [
      ...averagePick.perParticipant.slice(0, 2),
      { name: "지연", minutes: null },
    ],
  };
  expect(templateReason(unknown, 3)).toBe("평균 31분이면 도착해요.");
});

test("문장 틀: 장소 공정성", () => {
  const f = { ...averagePick, axis: "fairness" as const };
  expect(templateReason(f, 3)).toBe("가장 오래 걸리는 사람도 45분이면 와요.");
  const unknown = {
    ...f,
    perParticipant: [
      { name: "현호", minutes: null },
      { name: "민수", minutes: 45 },
    ],
  };
  expect(templateReason(unknown, 2)).toBe("이동 거리가 가장 고른 역이에요.");
  expect(templateReason({ ...f, maxMinutes: null }, 3)).toBe(
    "이동 거리가 가장 고른 역이에요.",
  );
});

test("목적 축: 가게 수와 최대 시간", () => {
  const v = (label: string, count: number, maxMinutes: number | null) => ({
    ...averagePick,
    axis: "venues" as const,
    venue: { label, count },
    maxMinutes,
  });
  expect(templateReason(v("술집", 120, 40), 3)).toBe(
    "술집이 120곳 있고, 다들 40분 안에 와요.",
  );
  expect(templateReason(v("카페", 8, null), 3)).toBe("카페가 8곳 있어요.");
  expect(templateReason(v("음식점", 5, 30), 3)).toBe(
    "음식점이 5곳 있고, 다들 30분 안에 와요.",
  );
  expect(templateReason(v("스터디 카페", 3, null), 3)).toBe(
    "스터디 카페가 3곳 있어요.",
  );
});
