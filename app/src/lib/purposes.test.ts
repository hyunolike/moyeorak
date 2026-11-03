import { describe, expect, it } from "vitest";
import { hubScore, parsePurposes, venueLine, ZERO_VENUES } from "./purposes";

describe("purposes", () => {
  it("목적이 없으면 음식점과 카페를 보여줘요", () => {
    expect(venueLine({ ...ZERO_VENUES, meal: 340, cafe: 120 }, [])).toBe(
      "음식점 340곳, 카페 120곳",
    );
  });

  it("목적이 있으면 표 순서로 앞의 두 개를 보여줘요", () => {
    expect(
      venueLine({ ...ZERO_VENUES, drink: 120, study: 8, sight: 3 }, [
        "sight",
        "study",
        "drink",
      ]),
    ).toBe("술집 120곳, 스터디 카페 8곳");
  });

  it("알 수 없는 값과 중복은 버려요", () => {
    expect(parsePurposes(["study", "x", "study", "meal"])).toEqual([
      "meal",
      "study",
    ]);
    expect(parsePurposes("meal")).toEqual([]);
  });

  it("허브 점수는 음식점과 카페 합이에요", () => {
    expect(hubScore({ ...ZERO_VENUES, meal: 3, cafe: 4, drink: 99 })).toBe(7);
  });
});
