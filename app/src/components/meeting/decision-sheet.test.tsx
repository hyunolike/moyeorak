// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  DecisionSheet,
  decisionCaption,
  decisionSummary,
} from "@/components/meeting/decision-sheet";

afterEach(cleanup);

test("미응답 자리가 있으면 그 수를 경고한다", () => {
  expect(decisionCaption("schedule", 2)).toBe(
    "아직 2명이 응답하지 않았어요. 확정하면 더 남길 수 없어요",
  );
  expect(decisionCaption("schedule", 0)).toBe("확정하면 시간 투표가 닫혀요");
  expect(decisionCaption("location", 0)).toBe("확정하면 장소 투표가 닫혀요");
});

test("요약은 시간이면 시작 시각 하나, 장소면 역과 평균 시간이다", () => {
  expect(
    decisionSummary({ kind: "schedule", start: "2026-11-02T09:00:00.000Z" }),
  ).toBe("11월 2일 월요일 오후 6시");
  expect(
    decisionSummary({ kind: "location", name: "광흥창", averageMinutes: 22 }),
  ).toBe("광흥창역, 평균 22분");
});

test("같은 제목과 버튼으로 그린다", () => {
  render(
    <DecisionSheet
      kind="location"
      summary="광흥창역, 평균 22분"
      waiting={1}
      onConfirm={() => {}}
      onClose={() => {}}
    />,
  );
  const dialog = screen.getByRole("dialog", { name: "이걸로 확정할까요?" });
  expect(within(dialog).getByText("광흥창역, 평균 22분")).toBeVisible();
  expect(
    within(dialog).getByText(
      "아직 1명이 응답하지 않았어요. 확정하면 더 남길 수 없어요",
    ),
  ).toBeVisible();
  expect(within(dialog).getByRole("button", { name: "확정하기" })).toBeTruthy();
});
