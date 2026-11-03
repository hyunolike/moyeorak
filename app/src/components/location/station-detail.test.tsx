import { ZERO_VENUES } from "@/lib/purposes";
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { StationDetail } from "@/components/location/station-detail";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("측정용 이동시간 상세는 애니메이션 프레임 없이 최종 막대 폭을 그린다", () => {
  const frame = vi.spyOn(window, "requestAnimationFrame");
  const { container } = render(
    <StationDetail
      animate={false}
      station={{
        stationId: -1,
        name: "가운데역",
        line: "2호선",
        lat: 0,
        lng: 0,
        averageMinutes: 30,
        maxMinutes: null,
        venues: ZERO_VENUES,
        far: false,
        perParticipant: [{ name: "참여자", minutes: 30 }],
      }}
    />,
  );
  expect(frame).not.toHaveBeenCalled();
  expect(container.querySelector("span[style]")).toHaveStyle({ width: "60%" });
});
