import { expect, test } from "vitest";
import { stageRedirect } from "@/lib/stage-route";

const m = (status: "scheduling" | "locating" | "confirmed", scope = "both") =>
  ({ id: "m1", status, scope }) as const;

test("시간을 모으는 중이면 시간 화면에 그대로 둔다", () => {
  expect(stageRedirect(m("scheduling"), "schedule")).toBeNull();
  expect(stageRedirect(m("scheduling"), "schedule-votes")).toBeNull();
});

test("시간이 정해져 장소 단계면 시간 화면 링크는 출발지 화면으로 보낸다", () => {
  expect(stageRedirect(m("locating"), "schedule")).toBe(
    "/meetings/m1/location/votes",
  );
  expect(stageRedirect(m("locating"), "schedule-votes")).toBe(
    "/meetings/m1/location/votes",
  );
});

test("약속이 확정되면 어느 단계 화면이든 약속 카드로 보낸다", () => {
  for (const page of [
    "schedule",
    "schedule-votes",
    "location-votes",
    "location-stations",
  ] as const) {
    expect(stageRedirect(m("confirmed"), page)).toBe("/meetings/m1/summary");
    expect(stageRedirect(m("confirmed", "schedule"), page)).toBe(
      "/meetings/m1/summary",
    );
  }
});

test("장소 단계의 장소 화면은 그대로 둔다", () => {
  expect(stageRedirect(m("locating"), "location-votes")).toBeNull();
  expect(
    stageRedirect(m("locating", "location"), "location-stations"),
  ).toBeNull();
});
